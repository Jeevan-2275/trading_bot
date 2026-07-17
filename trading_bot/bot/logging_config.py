import logging
import os

LOG_FILE = os.environ.get("BOT_LOG_FILE", os.path.join(os.path.dirname(__file__), "..", "trading_bot.log"))

def setup_logging(log_file=None):
    """
    Sets up a logger that logs to both the console (using rich if available)
    and a local log file.
    """
    if log_file is None:
        log_file = LOG_FILE

    logger = logging.getLogger("trading_bot")
    logger.setLevel(logging.DEBUG)

    # Remove existing handlers to avoid duplicates
    if logger.hasHandlers():
        logger.handlers.clear()

    # File Handler - captures everything (DEBUG level and up)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    # Ensure log directory exists
    log_dir = os.path.dirname(log_file)
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    # Console Handler - captures INFO level and up
    try:
        from rich.logging import RichHandler
        console_handler = RichHandler(
            rich_tracebacks=True,
            markup=True,
            show_path=False,
            omit_repeated_times=True
        )
        console_handler.setLevel(logging.INFO)
    except ImportError:
        # Fallback to standard stream handler if rich is not installed
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter('[%(levelname)s] %(message)s')
        console_handler.setFormatter(console_formatter)

    logger.addHandler(console_handler)
    return logger

# Default logger — call setup_logging() before use
logger = logging.getLogger("trading_bot")
