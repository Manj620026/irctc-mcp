# 🚂 `irctc-mcp` — Indian Railways Model Context Protocol (MCP) Server

[![irctc.dev](https://img.shields.io/badge/Rail_Engine-irctc.dev-orange?style=flat-square)](https://irctc.dev)
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP_2024--11--05-blue?style=flat-square)](https://modelcontextprotocol.io)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-0_External-green?style=flat-square)](https://nodejs.org)

Official **Model Context Protocol (MCP)** server for [irctc.dev](https://irctc.dev). Connects **Cursor**, **Windsurf**, **Claude Code**, and **Claude Desktop** to authoritative Indian Railways real-time telemetry with sub-second execution.

When you ask your AI IDE:
> *"Check if my train 12557 is on time"* or *"Are there vacant seats on Rajdhani from Delhi to Patna?"*

Your AI agent automatically invokes `irctc-mcp` tools to inspect live PRS reservation charts, seat availability forecasts, and GPS delay metrics.

---

## ⚡ 1-Minute Quickstart

### 1. Cursor IDE Integration (`.cursor/mcp.json`)
Add the following to your project's `.cursor/mcp.json` or global Cursor settings:

```json
{
  "mcpServers": {
    "irctc": {
      "command": "npx",
      "args": ["-y", "irctc-mcp"],
      "env": {
        "IRCTC_API_KEY": "YOUR_IRCTC_DEV_API_KEY"
      }
    }
  }
}
```
*(Get 10,000 Free Credits in 5 seconds at [https://irctc.dev/dashboard](https://irctc.dev/dashboard))*

### 2. Claude Desktop (`claude_desktop_config.json`)
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "indian-railways": {
      "command": "npx",
      "args": ["-y", "irctc-mcp"],
      "env": {
        "IRCTC_API_KEY": "YOUR_IRCTC_DEV_API_KEY"
      }
    }
  }
}
```

### 3. Claude Code CLI
```bash
claude mcp add irctc-mcp -- npx -y irctc-mcp
```

### 4. Windsurf / Cascade
Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "irctc": {
      "command": "npx",
      "args": ["-y", "irctc-mcp"],
      "env": {
        "IRCTC_API_KEY": "YOUR_IRCTC_DEV_API_KEY"
      }
    }
  }
}
```

---

## 🛠️ Available Agent Tools (14 Production Tools)

| Tool Name | Parameters | Capabilities |
| :--- | :--- | :--- |
| `check_pnr` | `pnr` (10-digit string) | Real-time passenger manifest, coach & berth allocations (`S4 65 LOWER`), confirmation probability, and chart status. |
| `get_live_running_status` | `train_no` (string), `date?` (YYYY-MM-DD) | Live GPS train running position, current delay in minutes, next halt, platform numbers, and estimated timings. |
| `search_trains` | `from` (station code), `to` (station code), `date?` | Direct trains between any two stations with duration, distance in km, running days, and base fares. |
| `check_seat_availability` | `train_no`, `from`, `to`, `date` (DD-MM-YYYY), `class_code?`, `quota?` | Official 14-day continuous calendar forecast across travel classes (`3A`, `2A`, `SL`) and quotas (`GN`, `TQ`, `PT`). |
| `get_vacant_berths_post_chart` | `train_no`, `boarding_station`, `date?`, `class_code?` | Post-charting vacant berths from online reservation charts for Current Booking and TTE allocation. |
| `get_train_fare` | `train_no`, `from`, `to`, `class_code?`, `quota?` | Calculate official IRCTC train fare breakdown across travel classes (1A, 2A, 3A, 3E, SL, CC, 2S) and quotas. |
| `get_train_schedule` | `train_no` | Full train route schedule, intermediate halt stations, arrival/departure timings, stop durations, and distance. |
| `get_train_by_number` | `train_no` | Quick train basic details by train number, including train name, type, origin, destination, and running days. |
| `search_trains_by_name` | `name` (min 2 chars) | Partial name train search (e.g., "Rajdhani", "Vande Bharat", "Shatabdi", "Garib Rath"). |
| `get_station_timetable` | `station_code`, `date` | Station timetable: arrivals & departures board of all trains passing through a station on a given date. |
| `search_stations` | `query` | Fast autocomplete search for Indian Railways stations by station code or city name. |
| `get_station_by_code` | `station_code` | Detailed station information by station code (e.g. "NDLS"), including station name, state, and railway division. |
| `get_cancelled_trains` | _none_ | Real-time list of today's cancelled, fully cancelled, and partially cancelled Indian Railways trains. |
| `get_engine_health` | _none_ | Check irctc.dev Rail Engine health, offline corpus status, and in-memory index performance. |

---

## 💡 Example Prompts to Ask Your AI Agent

- *"Is PNR 2265248473 confirmed? What are the coach and berth numbers?"*
- *"What is the current delay and next station for train 12557 today?"*
- *"Find all trains from New Delhi (NDLS) to Patna (PNBE) for this Friday."*
- *"Check 14-day 3A seat availability for train 12557 from NKE to ANVT starting 17-11-2026."*
- *"Are there any vacant berths on Vande Bharat 26501 departing Gorakhpur?"*

---

## 🔐 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `IRCTC_API_KEY` | Your secret API key from irctc.dev. If omitted, checks `~/.irctc/config.json` or uses anonymous free daily quota. | `null` |
| `IRCTC_API_BASE_URL` | Production Rail Engine Gateway. | `https://api.irctc.dev` |

---

## 📄 License

MIT © [IRCTC API Platform](https://irctc.dev)
