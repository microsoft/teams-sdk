> [!WARNING]
> **Deprecated** — This package is no longer maintained. We recommend migrating to [teams.py](https://github.com/microsoft/teams.py), which is the successor to this package.

# Teams AI Library

Welcome to the Teams AI Library Python package! 

This SDK is specifically designed to assist you in creating bots capable of interacting with Teams and Microsoft 365 applications. It is constructed using the [Bot Framework SDK](https://github.com/microsoft/botbuilder-python) as its foundation, simplifying the process of developing bots that interact with Teams' artificial intelligence capabilities. See the [Teams AI repo README.md](https://github.com/microsoft/teams-ai), for general information.

Requirements:
*   [Python](https://www.python.org/downloads/) (>=3.9, <4.0)
*   [Poetry](https://python-poetry.org/docs/)

## Getting Started

To get started, take a look at the [getting started docs](https://github.com/microsoft/teams-ai/blob/main/getting-started/README.md).

### Install Dependencies

```bash
$: poetry install
```

### Build

```bash
$: poetry build
```

### Test

```bash
$: poetry run test
```

### Lint

```bash
$: poetry run lint
```

## Format

```bash
$: poetry run fmt
```

## Clean

```bash
$: poetry run clean
```


## Migration

If you're migrating an existing project, switching to add on the Teams AI Library layer is quick and simple. See the [migration guide](https://github.com/microsoft/teams-ai/blob/main/getting-started/MIGRATION/03.PYTHON.md).
