import logging

logFormatter = logging.Formatter("%(asctime)s\t%(levelname)s\t%(module)s\t%(message)s")
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
for handler in (logging.FileHandler('log.txt'), logging.StreamHandler()):
    handler.setFormatter(logFormatter)
    logger.addHandler(handler)
