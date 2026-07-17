import os
import sys
from unittest.mock import patch, MagicMock

# Ensure project root is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from cli import main

def run_mock_scenario() -> None:
    # Set dummy credentials so credential checks pass
    os.environ["BINANCE_API_KEY"] = "mocked_api_key_for_log_generation_123"
    os.environ["BINANCE_API_SECRET"] = "mocked_api_secret_for_log_generation_456"
    
    # --- Scenario 1: Successful MARKET BUY order ---
    print("Simulating Successful MARKET BUY order...")
    sys.argv = [
        "cli.py",
        "--symbol", "BTCUSDT",
        "--side", "BUY",
        "--type", "MARKET",
        "--quantity", "0.05"
    ]
    
    with patch("bot.client.requests.get") as mock_get, patch("bot.client.requests.post") as mock_post:
        # Time sync response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"serverTime": 1700000000000}
        
        # Order placement response
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "orderId": 4512984,
            "symbol": "BTCUSDT",
            "status": "FILLED",
            "clientOrderId": "my_market_order_123",
            "price": "0.0",
            "avgPrice": "34250.50",
            "origQty": "0.05",
            "executedQty": "0.05",
            "cumQuote": "1712.525",
            "timeInForce": "GTC",
            "type": "MARKET",
            "side": "BUY",
            "updateTime": 1700000005000
        }
        
        main()

    # --- Scenario 2: Successful LIMIT SELL order ---
    print("Simulating Successful LIMIT SELL order...")
    sys.argv = [
        "cli.py",
        "--symbol", "ETHUSDT",
        "--side", "SELL",
        "--type", "LIMIT",
        "--quantity", "1.2",
        "--price", "1850.50"
    ]
    
    with patch("bot.client.requests.get") as mock_get, patch("bot.client.requests.post") as mock_post:
        # Time sync response
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"serverTime": 1700000000000}
        
        # Order placement response
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "orderId": 4512999,
            "symbol": "ETHUSDT",
            "status": "NEW",
            "clientOrderId": "my_limit_order_456",
            "price": "1850.50",
            "avgPrice": "0.0",
            "origQty": "1.2",
            "executedQty": "0.0",
            "cumQuote": "0.0",
            "timeInForce": "GTC",
            "type": "LIMIT",
            "side": "SELL",
            "updateTime": 1700000010000
        }
        
        main()

if __name__ == "__main__":
    run_mock_scenario()
