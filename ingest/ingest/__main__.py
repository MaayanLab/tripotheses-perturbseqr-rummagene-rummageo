import importlib
from pathlib import Path
from ingest.cli import cli

__dir__ = Path(__file__).parent / 'cli'
for f in __dir__.rglob('[!_]*.py'):
  importlib.import_module(
    '.'.join([
      'ingest', 'cli',
      *f.relative_to(__dir__).parts[:-1],
      f.stem,
    ])
  )

if __name__ == '__main__':
  cli()
