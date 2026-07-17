from typing import Dict, Any, Optional
from bot.validators import (
    validate_symbol,
    validate_side,
    validate_order_type,
    validate_quantity,
    validate_price,
    validate_stop_price
)
from bot.client import BinanceFuturesClient
from bot.logging_config import logger

def execute_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    order_type: str,
    quantity: Any,
    price: Optional[Any] = None,
    stop_price: Optional[Any] = None,
    test_mode: bool = False
) -> Dict[str, Any]:
    """
    Performs validation on order inputs and submits the order to Binance Futures Testnet
    using the BinanceFuturesClient. Handles logging and standardizes success/failure returns.
    """
    logger.info("=" * 50)
    logger.info("Initializing Order Placement Request")
    logger.info("=" * 50)
    
    # 1. Parameter Validation
    try:
        valid_symbol = validate_symbol(symbol)
        valid_side = validate_side(side)
        valid_type = validate_order_type(order_type)
        valid_qty = validate_quantity(quantity)
        valid_price = validate_price(price, valid_type)
        valid_stop_price = validate_stop_price(stop_price, valid_type)
        
        logger.info("Step 1: Input Validation Passed")
        logger.debug(
            f"Details -> Symbol: {valid_symbol}, Side: {valid_side}, Type: {valid_type}, "
            f"Qty: {valid_qty}, Price: {valid_price}, Stop Price: {valid_stop_price}"
        )
    except ValueError as e:
        error_msg = f"Input validation failed: {str(e)}"
        logger.error(f"Step 1: Input Validation Failed - {error_msg}")
        return {
            "success": False,
            "error_type": "Validation",
            "message": error_msg
        }

    # 2. Check for missing credentials
    if not api_key or not api_secret or api_key.strip() == "" or api_secret.strip() == "":
        error_msg = "API credentials are empty or missing."
        logger.error(f"Step 2: Credential Check Failed - {error_msg}")
        return {
            "success": False,
            "error_type": "Credentials",
            "message": "Missing API Key or Secret. Set them in your environment or .env file."
        }
        
    if api_key.startswith("your_") or api_secret.startswith("your_"):
        error_msg = "API credentials still contain template placeholder values."
        logger.error(f"Step 2: Credential Check Failed - {error_msg}")
        return {
            "success": False,
            "error_type": "Credentials",
            "message": "Please replace the placeholder values in the .env file with your actual Testnet credentials."
        }

    # 3. Create client
    logger.info("Step 3: Instantiating API Client...")
    client = BinanceFuturesClient(api_key=api_key, api_secret=api_secret)

    # 4. Send Order
    logger.info(f"Step 4: Submitting order request (Test Mode = {test_mode})...")
    result = client.place_order(
        symbol=valid_symbol,
        side=valid_side,
        order_type=valid_type,
        quantity=valid_qty,
        price=valid_price,
        stop_price=valid_stop_price,
        test_mode=test_mode
    )

    # 5. Process API Output
    if result["success"]:
        data = result["data"]
        logger.info("Step 5: Order Submission SUCCESSFUL")
        
        # Test mode endpoint returns empty dict {} on success
        if test_mode:
            summary = "Dry-run order validation succeeded. Parameters and credentials are valid."
            logger.info(summary)
            return {
                "success": True,
                "test_mode": True,
                "message": summary,
                "data": data
            }
        else:
            order_id = data.get("orderId")
            status = data.get("status")
            exec_qty = data.get("executedQty", "0.0")
            avg_price = data.get("avgPrice", "0.0")
            
            logger.info(f"Order executed - OrderId: {order_id}, Status: {status}")
            return {
                "success": True,
                "test_mode": False,
                "order_id": order_id,
                "status": status,
                "executed_qty": exec_qty,
                "avg_price": avg_price,
                "data": data
            }
    else:
        # Request failed
        logger.error("Step 5: Order Submission FAILED")
        data = result["data"]
        code = data.get("code", -1)
        msg = data.get("msg", "Unknown error response from API.")
        
        error_msg = f"Binance API Error (Code: {code}): {msg}"
        logger.error(error_msg)
        return {
            "success": False,
            "error_type": "API",
            "code": code,
            "message": error_msg,
            "data": data
        }
