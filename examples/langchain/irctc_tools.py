"""
Official LangChain & CrewAI Integration Wrappers for irctc.dev / irctc-mcp
Allows autonomous LLM agents to query live Indian Railways data in Python.
"""

import os
import json
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any

try:
    from langchain.tools import tool
except ImportError:
    # Standalone fallback decorator if langchain is not installed in environment
    def tool(func):
        func.is_tool = True
        return func

BASE_URL = os.environ.get("IRCTC_API_BASE_URL", "https://api.irctc.dev").rstrip("/")
API_KEY = os.environ.get("IRCTC_API_KEY", "")


def _request(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"
    if params:
        query_string = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        url = f"{url}?{query_string}"

    headers = {
        "Accept": "application/json",
        "User-Agent": "irctc-langchain/1.0.0",
    }
    if API_KEY:
        headers["x-api-key"] = API_KEY

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(error_body)
            return {"success": False, "error": parsed.get("error") or parsed.get("message") or str(e)}
        except Exception:
            return {"success": False, "error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@tool
def check_pnr_status(pnr: str) -> str:
    """
    Check real-time Indian Railways PNR status.
    Args:
        pnr: Exactly 10-digit PNR reservation number (e.g. '2265248473').
    Returns:
        JSON string containing coach, berth number (e.g. S4 65 LOWER), and chart preparation status.
    """
    clean_pnr = "".join(filter(str.isdigit, str(pnr)))
    if len(clean_pnr) != 10:
        return json.dumps({"success": False, "error": "PNR must be exactly 10 digits"})
    result = _request(f"/api/v1/pnr/{clean_pnr}")
    return json.dumps(result, indent=2)


@tool
def get_live_train_status(train_no: str, date: Optional[str] = None) -> str:
    """
    Get live running status and GPS delay for an Indian Railways train.
    Args:
        train_no: 4 or 5 digit train number (e.g. '12557' for Sapt Kranti, '12309' for Rajdhani).
        date: Optional departure date in YYYY-MM-DD format. Defaults to today.
    Returns:
        JSON string containing current delay in minutes, next station halt, and platform numbers.
    """
    params = {"date": date} if date else None
    result = _request(f"/api/v1/live/{train_no.strip()}", params)
    return json.dumps(result, indent=2)


@tool
def search_trains_between_stations(from_station: str, to_station: str, date: Optional[str] = None) -> str:
    """
    Search direct running trains between two Indian Railways stations.
    Args:
        from_station: 2-6 letter origin station code (e.g. 'NDLS' for New Delhi).
        to_station: 2-6 letter destination station code (e.g. 'PNBE' for Patna).
        date: Optional journey date in YYYY-MM-DD format.
    Returns:
        JSON string listing trains with departure/arrival times, duration, distance, and running days.
    """
    params = {
        "from": from_station.strip().toUpperCase() if hasattr(from_station, "toUpperCase") else from_station.strip().upper(),
        "to": to_station.strip().upper(),
        "date": date,
    }
    result = _request("/api/v1/trains/search", params)
    return json.dumps(result, indent=2)


@tool
def check_seat_availability(train_no: str, from_station: str, to_station: str, date: str, class_code: str = "3A", quota: str = "GN") -> str:
    """
    Check 14-day continuous seat availability calendar forecast across travel classes and quotas.
    Args:
        train_no: 5-digit train number (e.g. '12557').
        from_station: Origin station code (e.g. 'NKE').
        to_station: Destination station code (e.g. 'ANVT').
        date: Journey date in DD-MM-YYYY format (e.g. '17-11-2026').
        class_code: Travel class ('1A', '2A', '3A', '3E', 'SL'). Default is '3A'.
        quota: Quota code ('GN', 'TQ', 'PT', 'LD'). Default is 'GN'.
    Returns:
        JSON string containing 14-day seat availability forecast.
    """
    params = {
        "from": from_station.strip().upper(),
        "to": to_station.strip().upper(),
        "date": date.strip(),
        "class": class_code.strip().upper(),
        "quota": quota.strip().upper(),
    }
    result = _request(f"/api/v1/trains/{train_no.strip()}/availability", params)
    return json.dumps(result, indent=2)


@tool
def get_vacant_berths_post_chart(train_no: str, boarding_station: str, date: Optional[str] = None, class_code: str = "ALL") -> str:
    """
    Find real-time vacant berths after chart preparation from online reservation charts.
    Args:
        train_no: 5-digit train number (e.g. '26501' or '12557').
        boarding_station: Boarding station code (e.g. 'GKP' or 'NKE').
        date: Optional journey date in YYYY-MM-DD format.
        class_code: Class filter (e.g. 'ALL', '3A', '2A', 'CC', 'SL'). Default is 'ALL'.
    Returns:
        JSON string containing vacant seats and coach layout for Current Booking.
    """
    params = {
        "boardingStation": boarding_station.strip().upper(),
        "class": class_code.strip().upper(),
    }
    if date:
        params["date"] = date.strip()
    result = _request(f"/api/v1/trains/{train_no.strip()}/chart-vacant", params)
    return json.dumps(result, indent=2)


# Export tool list for LangChain Agent initialization
IRCTC_TOOLS = [
    check_pnr_status,
    get_live_train_status,
    search_trains_between_stations,
    check_seat_availability,
    get_vacant_berths_post_chart,
]
