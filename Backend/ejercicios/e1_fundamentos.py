"""E1. Python y estructuras de control (subtemas 4.1 y 4.2).

Ejecuta con:  python ejercicios/e1_fundamentos.py
"""
import time
from functools import wraps
from typing import Any, Callable

NC = "22111724"  # Tu número de control


# ---------- Parte A. Condicionales ----------
def clasificar(calificacion: float) -> str:
    if calificacion < 0 or calificacion > 100:
        raise ValueError("La calificación debe estar en el rango de 0 a 100")
    elif calificacion >= 90:
        return "Excelente"
    elif calificacion >= 80:
        return "Notable"
    elif calificacion >= 70:
        return "Aprobado"
    else:
        return "No Acreditado"


def estatus(calificacion: float) -> str:
    return "Acredita" if calificacion >= 70 else "No Acredita"


# ---------- Parte B. Bucles con enumerate ----------
def mostrar_grupo() -> None:
    grupo: list[tuple[str, float]] = [
        (NC, 94.0),
        ("Alan", 68.5),
        ("Carlos", 85.0),
        ("Barron", 91.5),
        ("Eduardo", 72.0),
        ("Fernanda", 59.0),
        ("Gabriel", 88.0),
        ("Hector", 79.5),
        ("Antonio", 96.0),
        ("Sofia", 82.0),
        ("Mateo", 75.0),
        ("Lucia", 90.0),
        ("Diego", 65.0),
        ("Valeria", 88.5),
        ("Camila", 93.0),
        ("Daniel", 81.0)
    ]

    for i, (nombre, calif) in enumerate(grupo, start=1):
        clasif = clasificar(calif)
        print(f"{i}. {nombre} -> {calif} ({clasif})")


# ---------- Parte C. Comprension -----------------
def ejercicios_comprehensions(grupo: list[tuple[str, float]]) -> None:
    acreditados = [nombre for nombre, calif in grupo if calif >= 70]
    no_acreditados_red = [round(calif) for _, calif in grupo if calif < 70]
    diccionario_grupo = {nombre: clasificar(calif) for nombre, calif in grupo}

    print("\nAcreditados:", acreditados)
    print("No Acreditados redondeados:", no_acreditados_red)
    print("Diccionario:", diccionario_grupo)


# ---------- Parte D. while True con break ----------
def capturar_calificaciones() -> list[float]:
    calificaciones: list[float] = []
    while True:
        entrada = input("Ingresa una calificacion (o 'fin' para terminar): ").strip()
        if entrada.lower() == 'fin':
            break
        try: 
            val = float(entrada)
            if 0 <= val <= 100:
                calificaciones.append(val)
            else: 
                print("Error: Debe ser un numero entre 0 y 100.")
        except ValueError:
            print("Error: Entrada no valida.")
    return calificaciones


# ---------- Parte E. decorador ----------
def medir_tiempo(func: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(func)
    def envoltura(*args: Any, **kwargs: Any) -> Any:
        inicio = time.perf_counter()
        resultado = func(*args, **kwargs)
        fin = time.perf_counter()
        tiempo_ms = (fin - inicio) * 1000
        print(f"{func.__name__} tardó {tiempo_ms:.2f} ms")
        return resultado
    return envoltura


@medir_tiempo
def promedio(califs: list[float]) -> float:
    return sum(califs) / len(califs) if califs else 0.0


# ---------- Parte F. Las anotaciones no se cumplen solas ----------
def doble(x: int) -> int:
    return x * 2


if __name__ == "__main__":
    print(f"=== E1 Ejercicios (NC: {NC}) ===")
    mostrar_grupo()
    
    grupo_ejemplo = [(NC, 94.0), ("Ana", 68.5), ("Carlos", 85.0)]
    ejercicios_comprehensions(grupo_ejemplo)

    print("Parte F (prueba con string):", doble("ab"))