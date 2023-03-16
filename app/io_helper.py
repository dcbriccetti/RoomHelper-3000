from typing import Optional
from flask_socketio import SocketIO, emit
from app.applog import logger
from app.types import *

class IoHelper:
    def __init__(self, socketio: SocketIO, stations: list[station_dict]) -> None:
        self.socketio = socketio
        self.stations = stations

    def on_all_namespaces(self, event: str, handler):
        for ns in ALL_NS:
            self.socketio.on_event(event, handler, namespace=ns)

    def station_by_ip(self, ip: str) -> Optional[indexed_station]:
        matches: list[indexed_station] = [item for item in enumerate(self.stations) if ip == item[1].get('ip')]
        if not matches: return None
        if len(matches) > 1:
            logger.warning(f'More than one station has IP {ip}. Using first one.')
        return matches[0]

    def connect_or_disconnect(self, connected: bool, r) -> bool:
        match: Optional[indexed_station] = self.station_by_ip(r.remote_addr)
        if match:
            seat_index, station = match
            station['connected'] = connected
            emit('connect_station', {
                'seatIndex': seat_index,
                'connected': connected
            }, broadcast=True, namespace=TEACHER_NS)
            return True
        return False

    def log_connection(self, request):
        logger.info(f'Connection from {request.remote_addr}, {request.sid}, {request.user_agent}')
