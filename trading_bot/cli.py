import os
import sys
import json
import argparse
from typing import Tuple, Optional, Any

# Ensure current directory is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from bot.logging_config import setup_logging, logger
from bot.validators import (
    validate_symbol,
    validate_side,
    validate_order_type,
    validate_quantity,
    validate_price,
    validate_stop_price
)
from bot.orders import execute_order

# Load environment variables
def load_env() -> None:
    """
    Attempts to load environment variables from a .env file.
    Uses python-dotenv if installed, otherwise uses a basic custom parser.
    """
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        if os.path.exists(".env"):
            with open(".env", "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()

# Print formatting helpers
def print_success(text: str, json_mode: bool = False) -> None:
    if json_mode:
        return
    try:
        from rich.console import Console
        Console().print(f"[bold green]SUCCESS:[/bold green] {text}")
    except ImportError:
        print(f"\033[92mSUCCESS: {text}\033[0m")

def print_error(text: str, json_mode: bool = False) -> None:
    if json_mode:
        return
    try:
        from rich.console import Console
        Console().print(f"[bold red]ERROR:[/bold red] {text}")
    except ImportError:
        print(f"\033[91mERROR: {text}\033[0m")

def print_info(text: str, json_mode: bool = False) -> None:
    if json_mode:
        return
    try:
        from rich.console import Console
        Console().print(f"[bold yellow]INFO:[/bold yellow] {text}")
    except ImportError:
        print(f"\033[93mINFO: {text}\033[0m")

def print_table(title: str, data: dict, json_mode: bool = False) -> None:
    if json_mode:
        return
    try:
        from rich.table import Table
        from rich.console import Console
        table = Table(title=title, show_header=True, header_style="bold magenta")
        table.add_column("Field", style="cyan")
        table.add_column("Value", style="green")
        for k, v in data.items():
            table.add_row(str(k), str(v))
        Console().print(table)
    except ImportError:
        print(f"\n=== {title} ===")
        for k, v in data.items():
            print(f"{k}: {v}")
        print("=" * (len(title) + 8) + "\n")

def prompt_input(prompt_text: str, validator: Any = None) -> str:
    while True:
        try:
            val = input(prompt_text).strip()
            if validator:
                return validator(val)
            return val
        except ValueError as e:
            print_error(str(e))

def prompt_choice(prompt_text: str, choices: list) -> str:
    choices_str = "/".join(choices)
    while True:
        val = input(f"{prompt_text} ({choices_str}): ").strip().upper()
        if val in choices:
            return val
        print_error(f"Invalid selection. Please enter one of: {choices}")

def run_interactive() -> Tuple[str, str, str, float, Optional[float], Optional[float], bool]:
    try:
        from rich.console import Console
        from rich.panel import Panel
        Console().print(Panel.fit(
            "[bold cyan]Binance Futures Testnet[/bold cyan] — [bold white]Trading Bot Wizard[/bold white]",
            subtitle="Interactive Order Placement"
        ))
    except ImportError:
        print("\n=== Binance Futures Testnet Trading Bot ===\n")

    symbol = prompt_input("Enter symbol (e.g. BTCUSDT): ", validate_symbol)
    side = prompt_choice("Select side", ["BUY", "SELL"])
    order_type = prompt_choice("Select order type", ["MARKET", "LIMIT", "STOP_MARKET"])

    quantity = prompt_input("Enter quantity: ", validate_quantity)

    price = None
    if order_type == "LIMIT":
        price = prompt_input("Enter limit price: ", lambda p: validate_price(p, "LIMIT"))

    stop_price = None
    if order_type == "STOP_MARKET":
        stop_price = prompt_input("Enter stop price: ", lambda p: validate_stop_price(p, "STOP_MARKET"))

    test_input = input("Dry-run mode? (test endpoint, no real trade) [y/N]: ").strip().lower()
    test_mode = test_input in ("y", "yes")

    return symbol, side, order_type, quantity, price, stop_price, test_mode


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Binance Futures Testnet Trading Bot CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.01 --test
  python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.01 --price 60000
  python cli.py --symbol BTCUSDT --side SELL --type STOP_MARKET --quantity 0.01 --stop-price 55000
  python cli.py  (interactive wizard mode)
        """
    )
    parser.add_argument("--symbol", type=str, help="Trading pair (e.g. BTCUSDT)")
    parser.add_argument("--side", type=str, choices=["BUY", "SELL", "buy", "sell"], help="Order side")
    parser.add_argument("--type", dest="order_type", type=str,
                        choices=["MARKET", "LIMIT", "STOP_MARKET", "market", "limit", "stop_market"],
                        help="Order type")
    parser.add_argument("--quantity", type=float, help="Order quantity")
    parser.add_argument("--price", type=float, default=None, help="Limit price (required for LIMIT orders)")
    parser.add_argument("--stop-price", type=float, default=None, dest="stop_price",
                        help="Stop price (required for STOP_MARKET orders)")
    parser.add_argument("--test", action="store_true", help="Use test endpoint (dry run — no real trade)")
    parser.add_argument("--json", action="store_true", dest="json_output",
                        help="Output result as JSON (for programmatic use)")
    return parser


def main():
    load_env()
    setup_logging()

    parser = build_parser()
    args = parser.parse_args()

    json_mode = args.json_output

    # Determine if running in interactive or direct mode
    use_interactive = not any([args.symbol, args.side, args.order_type, args.quantity])

    if use_interactive and json_mode:
        # Interactive + JSON mode doesn't make sense; error out
        result = {"success": False, "message": "Interactive mode is not supported with --json flag."}
        print(json.dumps(result))
        sys.exit(1)

    if use_interactive:
        symbol, side, order_type, quantity, price, stop_price, test_mode = run_interactive()
    else:
        # Validate required fields for direct mode
        missing = []
        if not args.symbol: missing.append("--symbol")
        if not args.side: missing.append("--side")
        if not args.order_type: missing.append("--type")
        if args.quantity is None: missing.append("--quantity")

        if missing:
            if json_mode:
                result = {"success": False, "message": f"Missing required arguments: {', '.join(missing)}"}
                print(json.dumps(result))
                sys.exit(1)
            parser.error(f"Missing required arguments: {', '.join(missing)}")

        try:
            symbol = validate_symbol(args.symbol)
            side = validate_side(args.side)
            order_type = validate_order_type(args.order_type)
            quantity = validate_quantity(args.quantity)
            price = validate_price(args.price, order_type)
            stop_price = validate_stop_price(args.stop_price, order_type)
        except ValueError as e:
            if json_mode:
                print(json.dumps({"success": False, "message": str(e)}))
                sys.exit(1)
            print_error(str(e))
            sys.exit(1)

        test_mode = args.test

    api_key = os.environ.get("BINANCE_API_KEY", "")
    api_secret = os.environ.get("BINANCE_API_SECRET", "")

    # Print order summary (human mode only)
    if not json_mode:
        summary_data = {
            "Symbol": symbol,
            "Side": side,
            "Order Type": order_type,
            "Quantity": quantity,
            "Price": price if price is not None else "N/A",
            "Stop Price": stop_price if stop_price is not None else "N/A",
            "Dry Run (Test Mode)": "Yes" if test_mode else "No"
        }
        print_table("Order Request Details", summary_data)

    if not api_key or not api_secret:
        if json_mode:
            print(json.dumps({
                "success": False,
                "message": "API credentials not found. Set BINANCE_API_KEY and BINANCE_API_SECRET environment variables or configure a .env file."
            }))
            sys.exit(1)
        print_info("API Credentials not found in environment.\nYou can enter them below or configure a .env file.")
        api_key = input("Enter Binance Futures Testnet API Key: ").strip()
        api_secret = input("Enter Binance Futures Testnet API Secret: ").strip()

    # Execute order
    result = execute_order(
        api_key=api_key,
        api_secret=api_secret,
        symbol=symbol,
        side=side,
        order_type=order_type,
        quantity=quantity,
        price=price,
        stop_price=stop_price,
        test_mode=test_mode
    )

    if json_mode:
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)

    # Human-readable output
    if result["success"]:
        if result.get("test_mode"):
            print_success(result["message"])
        else:
            print_success("Order executed successfully on Testnet!")
            response_summary = {
                "OrderID": result.get("order_id"),
                "Status": result.get("status"),
                "Executed Qty": result.get("executed_qty"),
                "Average Price": result.get("avg_price")
            }
            print_table("Response Summary", response_summary)
    else:
        print_error(result["message"])
        if "data" in result:
            print_table("Error Payload", result["data"])


if __name__ == "__main__":
    main()
