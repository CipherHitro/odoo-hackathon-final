"""HTML email template rendering.

Templates live in app/services/email/templates/ and use simple
``{{placeholder}}`` tokens, so no extra template engine dependency is needed.
Both ``{{name}}`` and ``{{ name }}`` spellings are replaced.
"""

from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"


def render_template(template_name: str, **context: object) -> str:
    """Load an HTML template and replace its {{placeholders}} with values."""
    html = (TEMPLATES_DIR / template_name).read_text(encoding="utf-8")

    for key, value in context.items():
        html = html.replace("{{ " + str(key) + " }}", str(value))
        html = html.replace("{{" + str(key) + "}}", str(value))

    return html