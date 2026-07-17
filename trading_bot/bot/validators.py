import re
from typing import Union, Optional

def validate_symbol(symbol: str) -> str:
    """
    Validates the trading symbol (e.g., BTCUSDT).
    """
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol must be a non-empty string.")
    
    clean_symbol = symbol.strip().upper()
    if not re.match(r"^[A-Z0-9]{5,15}$", clean_symbol):
        raise ValueError(
            f"Invalid symbol: '{symbol}'. Must be alphanumeric and 5-15 characters "
            "(e.g., BTCUSDT, ETHUSDT)."
        )
    return clean_symbol

def validate_side(side: str) -> str:
    """
    Validates the order side (BUY or SELL).
    """
    if not side or not isinstance(side, str):
        raise ValueError("Side must be a non-empty string.")
    
    clean_side = side.strip().upper()
    if clean_side not in ["BUY", "SELL"]:
        raise ValueError(f"Invalid side: '{side}'. Must be either 'BUY' or 'SELL'.")
    return clean_side

def validate_order_type(order_type: str) -> str:
    """
    Validates the order type (MARKET, LIMIT, or STOP_MARKET).
    """
    if not order_type or not isinstance(order_type, str):
        raise ValueError("Order type must be a non-empty string.")
    
    clean_type = order_type.strip().upper()
    valid_types = ["MARKET", "LIMIT", "STOP_MARKET"]
    if clean_type not in valid_types:
        raise ValueError(f"Invalid order type: '{order_type}'. Must be one of {valid_types}.")
    return clean_type

def validate_quantity(quantity: Union[str, float, int]) -> float:
    """
    Validates the order quantity (must be a positive number).
    """
    if quantity is None:
        raise ValueError("Quantity is required.")
    try:
        qty_val = float(quantity)
    except (ValueError, TypeError):
        raise ValueError(f"Quantity must be a valid number, got '{quantity}'.")
    
    if qty_val <= 0:
        raise ValueError(f"Quantity must be greater than zero, got {qty_val}.")
    return qty_val

def validate_price(price: Optional[Union[str, float, int]], order_type: str) -> Optional[float]:
    """
    Validates the limit price (must be a positive number; required for LIMIT orders).
    """
    if order_type.upper() == "LIMIT":
        if price is None or str(price).strip() == "":
            raise ValueError("Price is required for LIMIT orders.")
        try:
            price_val = float(price)
        except (ValueError, TypeError):
            raise ValueError(f"Price must be a valid number, got '{price}'.")
        if price_val <= 0:
            raise ValueError(f"Price must be greater than zero, got {price_val}.")
        return price_val
    else:
        return None

def validate_stop_price(stop_price: Optional[Union[str, float, int]], order_type: str) -> Optional[float]:
    """
    Validates the stop price (must be a positive number; required for STOP_MARKET orders).
    """
    if order_type.upper() == "STOP_MARKET":
        if stop_price is None or str(stop_price).strip() == "":
            raise ValueError("Stop price is required for STOP_MARKET orders.")
        try:
            stop_val = float(stop_price)
        except (ValueError, TypeError):
            raise ValueError(f"Stop price must be a valid number, got '{stop_price}'.")
        if stop_val <= 0:
            raise ValueError(f"Stop price must be greater than zero, got {stop_val}.")
        return stop_val
    else:
        return None
