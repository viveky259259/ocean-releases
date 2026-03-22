# Ocean Enterprise Configuration

Ocean supports managed configuration for enterprise deployments. Settings can be enforced by IT administrators through MDM profiles or configuration files.

## Configuration Priority

Settings are resolved in this order (highest priority wins):

1. **MDM-managed** — macOS plist (`com.ocean.terminal`), Linux `/etc/ocean/managed.toml`
2. **Enterprise config** — `~/.ocean/enterprise.toml`
3. **User settings** — stored in Ocean's SQLite database
4. **Defaults** — hardcoded in the application

Managed settings cannot be overridden by users. They appear greyed out with a lock icon in the Settings panel.

## Configuration Keys

### Updates

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `updates.channel` | string | `"stable"` | Update channel: `stable`, `beta`, `nightly` |
| `updates.auto_update` | bool | `true` | Automatically check and install updates |

### Security

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `security.allow_external_urls` | bool | `true` | Allow opening URLs from terminal annotations |
| `security.allow_shell_commands` | bool | `true` | Allow shell command execution |
| `security.disable_telemetry` | bool | `false` | Disable all telemetry and crash reporting |

### Features

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `features.disable_a2ui` | bool | `false` | Disable A2UI rendering |
| `features.disable_connectors` | bool | `false` | Disable parallel execution connectors |
| `features.max_sessions_per_workspace` | int | `20` | Maximum sessions per workspace |

### History & Recording

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `history.recording_enabled` | bool | `true` | Enable session recording |
| `history.max_recording_size_mb` | int | `50` | Max size per recording file (MB) |
| `history.max_total_recordings_gb` | int | `10` | Max total recording storage (GB) |
| `history.retention_days` | int | `90` | Delete recordings older than N days |

## Deployment Methods

### macOS — MDM Profile

Create a `.mobileconfig` profile targeting the `com.ocean.terminal` preference domain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.ocean.terminal</string>
            <key>PayloadIdentifier</key>
            <string>com.ocean.terminal.managed</string>
            <key>PayloadUUID</key>
            <string>YOUR-UUID-HERE</string>
            <key>PayloadVersion</key>
            <integer>1</integer>

            <key>updates.channel</key>
            <string>stable</string>
            <key>updates.auto_update</key>
            <true/>
            <key>security.allow_external_urls</key>
            <false/>
            <key>security.disable_telemetry</key>
            <true/>
            <key>history.retention_days</key>
            <integer>30</integer>
        </dict>
    </array>
    <key>PayloadIdentifier</key>
    <string>com.ocean.terminal.profile</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>YOUR-PROFILE-UUID</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

Deploy via Jamf Pro, Kandji, or Intune.

### macOS — Manual

```bash
defaults write com.ocean.terminal updates.channel -string "stable"
defaults write com.ocean.terminal security.disable_telemetry -bool true
```

### Linux — Config File

Create `/etc/ocean/managed.toml`:

```toml
[updates]
channel = "stable"
auto_update = true

[security]
allow_external_urls = false
disable_telemetry = true

[features]
max_sessions_per_workspace = 10

[history]
recording_enabled = true
retention_days = 30
```

### Enterprise Config File

Users or deployment scripts can place a file at `~/.ocean/enterprise.toml` with the same format as the Linux managed config. This has lower priority than MDM-managed settings but higher than user preferences.
