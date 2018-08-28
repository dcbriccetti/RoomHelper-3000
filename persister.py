import logging

logger = logging.getLogger()


class Persister:
    def __init__(self):
        self.seat_indexes_by_ip = {}
        try:
            with open('stationloc.txt', 'r') as infile:
                for line in infile.readlines():
                    ip, index = line.split('\t')
                    self.seat_indexes_by_ip[ip] = int(index)
        except FileNotFoundError:
            pass

        self.log_operation('loaded')

    def save(self):
        if self.seat_indexes_by_ip:
            with open('stationloc.txt', 'w') as file:
                for ip, index in self.seat_indexes_by_ip.items():
                    file.write('%s\t%d\n' % (ip, index))

            self.log_operation('saved')

    def log_operation(self, op):
        logger.info('%s %d seat indexes' % (op, len(self.seat_indexes_by_ip)))
