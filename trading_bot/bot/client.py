import hmac
import hashlib
import time
from urllib.parse import urlencode
from typing import Dict, Any, Optional
import requests
from bot.logging_config import logger

class BinanceFuturesClient:
    """
    Client for interacting with the Binance Futures Testnet REST API.
    """
    def __init__(self, api_key: str, api_secret: str, base_url: str = "https://testnet.binancefuture.com"):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self.time_offset = 0
        
        # Try to sync time offset upon initialization
        self.sync_time()

    def sync_time(self) -> None:
        """
        Queries the Binance server time to calculate the offset relative to local time.
        Helps prevent the '-1021: Timestamp for this request is outside of the recvWindow' error.
        """
        url = f"{self.base_url}/fapi/v1/time"
        try:
            start_time = int(time.time() * 1000)
            response = requests.get(url, timeout=5)
            end_time = int(time.time() * 1000)
            
            if response.status_code == 200:
                server_time = response.json().get("serverTime")
                # Roundtrip transit estimate
                transit_time = (end_time - start_time) // 2
                self.time_offset = server_time - (start_time + transit_time)
                logger.debug(f"Synced server time. Local offset: {self.time_offset}ms")
            else:
                logger.warning(f"Failed to sync server time, status code: {response.status_code}")
        except Exception as e:
            logger.warning(f"Network error while syncing server time: {e}. Using local timestamp.")

    def get_timestamp(self) -> int:
        """
        Returns a synced millisecond timestamp.
        """
        return int(time.time() * 1000) + self.time_offset

    def _generate_signature(self, query_string: str) -> str:
        """
        Generates HMAC-SHA256 signature for a query string using the API secret.
        """
        return hmac.new(
            self.api_secret.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    def place_order(
        self,
        symbol: str,
        side: str,
        order_type: str,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        test_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Places a MARKET, LIMIT, or STOP_MARKET order.
        If test_mode is True, submits to the verification endpoint (/fapi/v1/order/test).
        """
        endpoint = "/fapi/v1/order/test" if test_mode else "/fapi/v1/order"
        url = f"{self.base_url}{endpoint}"
        
        # Build the parameter map
        params: Dict[str, Any] = {
            "symbol": symbol,
            "side": side,
            "type": order_type,
            "quantity": quantity,
            "timestamp": self.get_timestamp()
        }
        
        if order_type == "LIMIT":
            params["price"] = price
            params["timeInForce"] = "GTC"  # Good 'Til Cancelled is standard
        elif order_type == "STOP_MARKET":
            params["stopPrice"] = stop_price
            
        # Generate the signature
        query_string = urlencode(params)
        signature = self._generate_signature(query_string)
        params["signature"] = signature
        
        headers = {
            "X-MBX-APIKEY": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Log request (masking sensitive API secrets, signature is fine)
        masked_api_key = self.api_key[:6] + "..." if self.api_key else "None"
        logger.info(f"API Request: POST {endpoint} | Params: { {k:v for k,v in params.items() if k != 'signature'} }")
        logger.debug(f"API Request full query: {query_string} | Signature: {signature}")

        try:
            # Send using form-encoded POST payload
            response = requests.post(url, data=params, headers=headers, timeout=10)
            
            logger.info(f"API Response Status Code: {response.status_code}")
            logger.debug(f"API Response Body: {response.text}")
            
            try:
                response_json = response.json()
            except ValueError:
                response_json = {"msg": "Failed to decode JSON response", "raw": response.text}
                
            return {
                "status_code": response.status_code,
                "data": response_json,
                "success": 200 <= response.status_code < 300
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error during API call: {e}")
            return {
                "status_code": 0,
                "data": {"msg": f"Network error: {str(e)}"},
                "success": False
            }
