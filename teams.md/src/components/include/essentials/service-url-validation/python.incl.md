<!-- adding-custom-domains -->

```python
app = App(
    additional_allowed_domains=[".my-custom-channel.com"],
)
```

<!-- disabling-validation -->

```python
app = App(
    additional_allowed_domains=["*"],
)
```
