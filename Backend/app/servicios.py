import math


def dentro_de_juarez(lat: float, lng: float) -> bool:
    return 31.10 <= lat <= 31.82 and -106.95 <= lng <= -106.15


def distancia_metros(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radio_tierra_m = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radio_tierra_m * math.atan2(math.sqrt(a), math.sqrt(1 - a))