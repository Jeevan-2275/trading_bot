import unittest
from unittest.mock import patch, MagicMock
import hmac
import hashlib

from bot.validators import (
    validate_symbol,
    validate_side,
    validate_order_type,
    validate_quantity,
    validate_price,
    validate_stop_price
)
from bot.client import BinanceFuturesClient
from bot.orders import execute_order

class TestValidators(unittest.TestCase):
    """
    Unit tests for checking input parameter validation logic.
    """
    def test_symbol_validation(self):
        # Valid cases
        self.assertEqual(validate_symbol("btcusdt"), "BTCUSDT")
        self.assertEqual(validate_symbol("ETHUSDT"), "ETHUSDT")
        self.assertEqual(validate_symbol("solusdt"), "SOLUSDT")
        # Invalid cases
        with self.assertRaises(ValueError):
            validate_symbol("BTC")  # Too short
        with self.assertRaises(ValueError):
            validate_symbol("btc-usdt")  # Contains dash
        with self.assertRaises(ValueError):
            validate_symbol("")  # Empty

    def test_side_validation(self):
        # Valid cases
        self.assertEqual(validate_side("buy"), "BUY")
        self.assertEqual(validate_side("SELL"), "SELL")
        self.assertEqual(validate_side(" buy "), "BUY")
        # Invalid cases
        with self.assertRaises(ValueError):
            validate_side("HOLD")
        with self.assertRaises(ValueError):
            validate_side("long")

    def test_order_type_validation(self):
        # Valid cases
        self.assertEqual(validate_order_type("market"), "MARKET")
        self.assertEqual(validate_order_type("LIMIT"), "LIMIT")
        self.assertEqual(validate_order_type("STOP_MARKET"), "STOP_MARKET")
        # Invalid cases
        with self.assertRaises(ValueError):
            validate_order_type("STOP_LIMIT")  # Not in supported subset
        with self.assertRaises(ValueError):
            validate_order_type("TRAILING_STOP")

    def test_quantity_validation(self):
        # Valid cases
        self.assertEqual(validate_quantity(1.5), 1.5)
        self.assertEqual(validate_quantity("0.005"), 0.005)
        self.assertEqual(validate_quantity(100), 100.0)
        # Invalid cases
        with self.assertRaises(ValueError):
            validate_quantity(0)
        with self.assertRaises(ValueError):
            validate_quantity(-1.5)
        with self.assertRaises(ValueError):
            validate_quantity("abc")

    def test_price_validation(self):
        # Valid LIMIT cases
        self.assertEqual(validate_price(100.5, "LIMIT"), 100.5)
        self.assertEqual(validate_price("35000", "LIMIT"), 35000.0)
        # Invalid LIMIT cases
        with self.assertRaises(ValueError):
            validate_price(None, "LIMIT")
        with self.assertRaises(ValueError):
            validate_price("", "LIMIT")
        with self.assertRaises(ValueError):
            validate_price(-50.0, "LIMIT")
        # Non-LIMIT cases
        self.assertIsNone(validate_price(None, "MARKET"))
        self.assertIsNone(validate_price("123", "MARKET"))  # Ignored for MARKET

    def test_stop_price_validation(self):
        # Valid STOP_MARKET cases
        self.assertEqual(validate_stop_price(99.5, "STOP_MARKET"), 99.5)
        self.assertEqual(validate_stop_price("28000.1", "STOP_MARKET"), 28000.1)
        # Invalid STOP_MARKET cases
        with self.assertRaises(ValueError):
            validate_stop_price(None, "STOP_MARKET")
        with self.assertRaises(ValueError):
            validate_stop_price("", "STOP_MARKET")
        with self.assertRaises(ValueError):
            validate_stop_price(0.0, "STOP_MARKET")
        # Non-STOP_MARKET cases
        self.assertIsNone(validate_stop_price(None, "LIMIT"))


class TestClientAndOrders(unittest.TestCase):
    """
    Unit tests for client API queries, payload signature generation, and orders module coordination.
    """
    @patch("bot.client.requests.get")
    def test_client_initialization_and_signature(self, mock_get):
        # Mock server time sync request
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"serverTime": 1700000000000}
        mock_get.return_value = mock_response

        # Instantiate client
        client = BinanceFuturesClient(api_key="dummy_api_key", api_secret="dummy_api_secret")
        
        # Test signature generation
        test_query = "symbol=BTCUSDT&side=BUY&type=MARKET&quantity=1&timestamp=1700000000000"
        sig = client._generate_signature(test_query)
        
        expected_sig = hmac.new(
            b"dummy_api_secret",
            test_query.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        self.assertEqual(sig, expected_sig)

    @patch("bot.client.requests.get")
    @patch("bot.client.requests.post")
    def test_place_order_api_success(self, mock_post, mock_get):
        # Setup mocks
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"serverTime": 1700000000000}
        
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "orderId": 88888,
            "status": "NEW",
            "executedQty": "0.0",
            "avgPrice": "0.0"
        }
        
        client = BinanceFuturesClient(api_key="key", api_secret="secret")
        res = client.place_order(symbol="BTCUSDT", side="BUY", order_type="MARKET", quantity=0.01)
        
        self.assertTrue(res["success"])
        self.assertEqual(res["status_code"], 200)
        self.assertEqual(res["data"]["orderId"], 88888)

    def test_execute_order_validation_error(self):
        # Trigger validation failure early in execute_order
        res = execute_order(
            api_key="key",
            api_secret="secret",
            symbol="BTCUSDT",
            side="INVALID_SIDE",
            order_type="MARKET",
            quantity=0.1
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["error_type"], "Validation")
        self.assertIn("Invalid side", res["message"])

    def test_execute_order_credentials_error(self):
        # Check template placeholder trigger
        res = execute_order(
            api_key="your_testnet_api_key_here",
            api_secret="your_testnet_api_secret_here",
            symbol="BTCUSDT",
            side="BUY",
            order_type="MARKET",
            quantity=0.1
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["error_type"], "Credentials")

    @patch("bot.orders.BinanceFuturesClient")
    def test_execute_order_flow_success(self, mock_client_class):
        # Mock client instance and API success response
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_client.place_order.return_value = {
            "success": True,
            "data": {
                "orderId": 99999,
                "status": "FILLED",
                "executedQty": "0.5",
                "avgPrice": "34500.0"
            }
        }
        
        res = execute_order(
            api_key="real_key",
            api_secret="real_secret",
            symbol="BTCUSDT",
            side="BUY",
            order_type="MARKET",
            quantity=0.5
        )
        
        self.assertTrue(res["success"])
        self.assertEqual(res["order_id"], 99999)
        self.assertEqual(res["status"], "FILLED")
        self.assertEqual(res["executed_qty"], "0.5")
        self.assertEqual(res["avg_price"], "34500.0")

if __name__ == "__main__":
    unittest.main()
