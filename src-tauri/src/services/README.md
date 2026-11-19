# Backend service boundaries

- core/: serializable domain models and launch lifecycle contracts.
- services/: replaceable implementations for metadata, downloads, Java, instances, loaders and process supervision.
- commands/: narrow frontend-facing IPC. Commands validate input and delegate; business logic does not live here.
- state.rs: shared long-lived resources. Never hold a standard mutex across await.

## Target launch pipeline

1. Validate the selected instance and its settings.
2. Resolve Mojang version metadata and inherited manifests.
3. Select or provision the required Java major version.
4. Plan missing client, libraries, native classifiers and assets.
5. Download with bounded concurrency, retries, size/hash verification and atomic promotion.
6. Apply loader-specific installation and metadata steps.
7. Evaluate OS/architecture/feature rules and construct JVM/game arguments from metadata.
8. Spawn Java with the instance directory as working directory.
9. Stream stdout/stderr to logs and emit stage-based progress events.
10. Track process lifecycle, exit code and crash status.

Never build a single hard-coded Java command: modern manifests contain structured argument arrays and conditional rules; legacy versions may use minecraftArguments.

## Performance and reliability rules

- Reuse verified shared artifacts across instances where safe.
- Keep mutable mods, configs, saves and options isolated per instance.
- Bound concurrent transfers instead of spawning unlimited tasks.
- Cache metadata with freshness information; don't trust stale manifests indefinitely.
- Use spawn_blocking for CPU-heavy archive extraction or synchronous filesystem work.
- Emit aggregated progress rather than an IPC event for every tiny chunk.
- Support cooperative cancellation and clean temporary files after failures.
