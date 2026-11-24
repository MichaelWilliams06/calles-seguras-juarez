"""E5. Los tres significados de "clase" (subtema 4.5).

Ejecuta desde la raíz del repositorio:  python -m ejercicios.e5_clases
"""
from decimal import Decimal
from app.servicios import CalculadoraPrecio
from app.schemas import ProductoCrear
from app.models import Producto

NC = "22111724"


def main() -> None:
    # 1. Instancia de la clase de lógica de negocio / servicio
    calculadora = CalculadoraPrecio(iva=Decimal("0.16"))
    
    # 2. Instancia de la clase de esquema Pydantic
    producto_esquema = ProductoCrear(
        nombre=f"{NC} Teclado",
        descripcion="Teclado mecánico de prueba",
        precio=Decimal("450.00"),
        stock=15
    )
    
    # 3. Instancia de la clase modelo SQLAlchemy
    producto_modelo = Producto(
        nombre=f"{NC} Teclado",
        precio=Decimal("450.00"),
        existencias=15,
        categoria="Periféricos"
    )

    # Imprimir type(obj).__mro__ de cada una
    print("MRO de CalculadoraPrecio:", type(calculadora).__mro__)
    print("MRO de ProductoCrear:", type(producto_esquema).__mro__)
    print("MRO de Producto (SQLAlchemy):", type(producto_modelo).__mro__)

    # Tres assert sobre CalculadoraPrecio
    assert calculadora.precio_con_iva(Decimal("100.00")) == Decimal("116.00")
    assert calculadora.aplicar_descuento(Decimal("200.00"), 20) == Decimal("160.00")

    excepcion_lanzada = False
    try:
        calculadora.aplicar_descuento(Decimal("200.00"), 60)
    except ValueError:
        excepcion_lanzada = True
    assert excepcion_lanzada, "Se esperaba un ValueError al aplicar un descuento de 60%"

    print("¡Todas las pruebas del script E5 pasaron exitosamente!")


if __name__ == "__main__":
    main()