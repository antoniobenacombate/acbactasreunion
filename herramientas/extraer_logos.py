# Extrae los logotipos incrustados en la plantilla DOCX hacia public\
# Uso: python herramientas\extraer_logos.py
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / "samples" / "AAMMDD AR01 MODELO ACTA REUNION-E0g.docx"

with zipfile.ZipFile(PLANTILLA) as z:
    for nombre in z.namelist():
        if nombre.startswith("word/media/"):
            destino = RAIZ / "public" / Path(nombre).name
            destino.write_bytes(z.read(nombre))
            print(f"Extraído: {destino}")
