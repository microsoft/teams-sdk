<!-- list-inline-images -->

```python
@app.on_message
async def handle_message(ctx: ActivityContext[MessageActivity]) -> None:
    pasted_images = await ctx.files.list(attachment_style="inlineImage")

    if not pasted_images:
        await ctx.reply("Paste an image into your message and I will read it.")
        return

    await ctx.reply(f"You pasted {len(pasted_images)} image(s).")
```

<!-- download-inline-image -->

```python
import base64

image = await ctx.files.first(attachment_style="inlineImage")

if image:
    downloaded = await image.download()
    image_base64 = base64.b64encode(downloaded.bytes).decode("ascii")

    # Pass downloaded.bytes or image_base64, with downloaded.content_type, to your image-processing or model client.
```

<!-- errors-handling -->

```python
from microsoft_teams.apps import InlineImageTransformationError

try:
    downloaded = await image.download()
    # ...
except InlineImageTransformationError:
    await ctx.reply("That pasted image cannot be downloaded. Try sending it as a file attachment instead.")
```
