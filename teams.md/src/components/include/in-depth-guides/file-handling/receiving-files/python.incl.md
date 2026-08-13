<!-- accessing-files -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    uploaded = await ctx.files.list()

    if not uploaded:
        await ctx.reply("Send me a file and I will read it.")
        return

    names = ", ".join(f.name for f in uploaded)
    await ctx.reply(f"You sent {len(uploaded)} file(s): {names}")
```

<!-- first-file -->

```python
file = await ctx.files.first()

if file:
    await ctx.reply(f"Reading {file.name}...")
```

<!-- reading-download -->

```python
file = await ctx.files.first()

if file:
    downloaded = await file.download()

    await ctx.reply(f"Downloaded {downloaded.filename} ({len(downloaded.bytes)} bytes, {downloaded.content_type})")
```

<!-- reading-text -->

```python
file = await ctx.files.first()

if file:
    contents = await file.text()
    await ctx.reply(f"The file starts with: {contents[:100]}")
```

<!-- saving-to-disk -->

```python
await file.save_as("./uploads/report.pdf")
```

<!-- streaming -->

```python
async for chunk in file.stream():
    ...  # process each chunk (e.g. pipe to a parser)
```

<!-- metadata-table -->

| Property | Description |
|---|---|
| `unique_id` | The OneDrive/SharePoint drive-item id, when the platform provides it. Present only for files backed by ODSP storage. |
| `name` | File name including its extension (e.g. `report.pdf`). |
| `extension` | File extension without the dot (e.g. `pdf`), from the platform-supplied `file_type`. Absent when the platform omits it. |
| `content_type` | The file's MIME type, when the source provides one. Always unset for files received from a bot activity (every file today): the `file.download.info` attachment carries no MIME type, only the extension surfaced as `extension`. To learn the type of the bytes you actually received, read `content_type` on the downloaded file, which is resolved from the download response. |
| `scope` | The conversation scope the file arrived in (`personal`, `groupChat`, or `channel`). |
| `source` | Where the SDK found the file. Currently always `botActivity`. |
| `web_url` | A browsable link to the file in OneDrive/SharePoint, when known. Not a fetchable download URL. |
| `raw` | The original wire attachment (the metadata object, not the bytes) — see [Access the raw attachment](#access-the-raw-attachment). |

<!-- reusing-downloaded-file -->

```python
downloaded = await file.download()

text = downloaded.text()               # decode as UTF-8
data = downloaded.bytes                # the raw bytes
await downloaded.save_as("./copy.bin") # write to disk, no re-fetch
```

<!-- downloaded-table -->

| Property / method | Description |
|---|---|
| `bytes` | The buffered file bytes. |
| `content_type` | MIME type resolved from the download response header, or the incoming file's metadata type if the response omits one. Falls back to `application/octet-stream` when neither provides a type, so this is never empty. |
| `filename` | The resolved file name. |
| `source_url` | The URL the bytes were fetched from. |
| `text(encoding="utf-8")` | Decode the bytes as UTF-8 (or a given encoding). Lossy; never throws. |
| `save_as(path)` | Write the buffered bytes to a local path (no re-fetch). |

<!-- errors-import -->

```python
from microsoft_teams.apps import FileScopeNotSupportedError, FileUrlExpiredError
```

<!-- errors-handling -->

```python
try:
    downloaded = await file.download()
    # ...
except FileUrlExpiredError as err:
    if err.reason == "first_fetch":
        await ctx.reply("That file link has expired before it could be read.")
except FileScopeNotSupportedError as err:
    await ctx.reply(f"Downloading files from {err.scope} conversations is not supported yet.")
```

<!-- raw-attachment -->

```python
file = await ctx.files.first()

if file:
    # `raw` is the untyped wire attachment: the escape hatch when you need a
    # field the typed surface does not expose. Here we log the whole attachment
    # to inspect exactly what the platform sent.
    ctx.logger.debug("raw file attachment: %s", file.raw)
```
