'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');

const SERVER_NAME = 'irctc-mcp';
const SERVER_VERSION = '1.0.1';
const PROTOCOL_VERSION = '2024-11-05';

/**
 * Resolves active API key from environment variable or ~/.irctc/config.json
 */
function resolveApiKey() {
  if (process.env.IRCTC_API_KEY && process.env.IRCTC_API_KEY.trim()) {
    return process.env.IRCTC_API_KEY.trim();
  }

  try {
    const configPath = path.join(os.homedir(), '.irctc', 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
        return parsed.apiKey.trim();
      }
    }
  } catch {
    // Non-fatal fallback
  }

  return null;
}

function getBaseUrl() {
  const url = (process.env.IRCTC_API_BASE_URL || 'https://api.irctc.dev').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(url) ? url : 'https://api.irctc.dev';
}

/**
 * Standard MCP Tools Definitions
 */
const TOOLS = [
  {
    name: 'check_pnr',
    description: 'Check real-time Indian Railways PNR status, passenger manifest, coach & berth allocations (e.g. S4 65 LOWER BERTH), confirmation probability, and chart preparation status.',
    inputSchema: {
      type: 'object',
      properties: {
        pnr: {
          type: 'string',
          description: 'The 10-digit Indian Railways PNR reservation number (e.g. "2265248473").',
        },
      },
      required: ['pnr'],
    },
  },
  {
    name: 'get_live_running_status',
    description: 'Get real-time live running GPS status of any Indian Railways train, including current delay in minutes, last crossed station, upcoming halts, platform numbers, and estimated arrival/departure times.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 4-5 digit train number (e.g. "12557" for Sapt Kranti Express, "12309" for Rajdhani).',
        },
        date: {
          type: 'string',
          description: 'Optional departure date in YYYY-MM-DD format. Defaults to today.',
        },
      },
      required: ['train_no'],
    },
  },
  {
    name: 'search_trains',
    description: 'Search running trains between any two Indian Railways station codes with departure/arrival times, travel duration, distance in kilometers, running days, and base fare estimates.',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Origin station code (e.g. "NDLS" for New Delhi, "PNBE" for Patna).',
        },
        to: {
          type: 'string',
          description: 'Destination station code (e.g. "BTI" for Bathinda, "CSMT" for Mumbai).',
        },
        date: {
          type: 'string',
          description: 'Optional journey date in YYYY-MM-DD format (e.g. "2026-11-15").',
        },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'check_seat_availability',
    description: 'Fetch official 14-day continuous seat availability calendar forecast across travel classes (1A, 2A, 3A, 3E, SL) and quotas (GN, TQ, PT, LD) directly from PRS.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 5-digit train number (e.g. "12557").',
        },
        from: {
          type: 'string',
          description: 'Origin station code (e.g. "NKE").',
        },
        to: {
          type: 'string',
          description: 'Destination station code (e.g. "ANVT").',
        },
        date: {
          type: 'string',
          description: 'Journey date in DD-MM-YYYY format (e.g. "17-11-2026").',
        },
        class_code: {
          type: 'string',
          description: 'Travel class code (e.g. "3A", "2A", "1A", "SL"). Defaults to "3A".',
          default: '3A',
        },
        quota: {
          type: 'string',
          description: 'Booking quota code ("GN" for General, "TQ" for Tatkal, "PT" for Premium Tatkal). Defaults to "GN".',
          default: 'GN',
        },
      },
      required: ['train_no', 'from', 'to', 'date'],
    },
  },
  {
    name: 'get_vacant_berths_post_chart',
    description: 'Find real-time vacant berths and seats after chart preparation from online reservation charts for Current Booking and TTE allocation onboard.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 5-digit train number (e.g. "26501" or "12557").',
        },
        boarding_station: {
          type: 'string',
          description: 'Boarding station code (e.g. "GKP" or "NKE").',
        },
        date: {
          type: 'string',
          description: 'Journey date in YYYY-MM-DD format. Defaults to today.',
        },
        class_code: {
          type: 'string',
          description: 'Travel class filter (e.g. "ALL", "3A", "2A", "CC", "SL"). Defaults to "ALL".',
          default: 'ALL',
        },
      },
      required: ['train_no', 'boarding_station'],
    },
  },
  {
    name: 'get_train_fare',
    description: 'Calculate official IRCTC train fare breakdown across travel classes (1A, 2A, 3A, 3E, SL, CC, 2S) and quotas between origin and destination stations.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 4-5 digit train number (e.g. "12557").',
        },
        from: {
          type: 'string',
          description: 'Origin station code (e.g. "ANVT").',
        },
        to: {
          type: 'string',
          description: 'Destination station code (e.g. "MFP").',
        },
        class_code: {
          type: 'string',
          description: 'Optional travel class filter (e.g. "all", "3A", "2A", "SL"). Defaults to "all".',
          default: 'all',
        },
        quota: {
          type: 'string',
          description: 'Booking quota code ("GN", "TQ", "PT"). Defaults to "GN".',
          default: 'GN',
        },
      },
      required: ['train_no', 'from', 'to'],
    },
  },
  {
    name: 'get_train_schedule',
    description: 'Get full train route schedule, intermediate halt stations, arrival/departure timings, stop durations, and total distance in km.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 4-5 digit train number (e.g. "12557").',
        },
      },
      required: ['train_no'],
    },
  },
  {
    name: 'get_train_by_number',
    description: 'Get quick train basic details by train number, including official train name, train type, origin, destination, running days, and total distance.',
    inputSchema: {
      type: 'object',
      properties: {
        train_no: {
          type: 'string',
          description: 'The 4-5 digit train number (e.g. "12557").',
        },
      },
      required: ['train_no'],
    },
  },
  {
    name: 'search_trains_by_name',
    description: 'Search Indian Railways trains by train name query (partial match, e.g. "Rajdhani", "Shatabdi", "Vande Bharat", "Garib Rath").',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Train name to search for (minimum 2 characters, e.g. "rajdhani").',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_station_timetable',
    description: 'Get all trains passing through, arriving at, or departing from a station on a given date (station timetable / arrivals & departures board).',
    inputSchema: {
      type: 'object',
      properties: {
        station_code: {
          type: 'string',
          description: 'Station code (e.g. "NDLS" for New Delhi, "PNBE" for Patna).',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD or DD-MM-YYYY format (e.g. "2026-10-30").',
        },
      },
      required: ['station_code', 'date'],
    },
  },
  {
    name: 'search_stations',
    description: 'Autocomplete search Indian Railways stations by station code or partial city name (e.g. "NDLS", "delhi", "patna").',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string for station code or city name (e.g. "delhi").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_station_by_code',
    description: 'Get detailed station information by station code, including station name, state, and railway division.',
    inputSchema: {
      type: 'object',
      properties: {
        station_code: {
          type: 'string',
          description: 'Station code (e.g. "NDLS", "PNBE", "BTI").',
        },
      },
      required: ['station_code'],
    },
  },
  {
    name: 'get_cancelled_trains',
    description: 'Get real-time list of today\'s cancelled, fully cancelled, and partially cancelled Indian Railways trains.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_engine_health',
    description: 'Check irctc.dev Rail Engine health, offline corpus status, and in-memory index performance.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Execute tool against irctc.dev API Gateway
 */
async function executeTool(name, args = {}) {
  const baseUrl = getBaseUrl();
  const apiKey = resolveApiKey();

  const headers = {
    'Accept': 'application/json',
    'x-client': 'irctc-mcp',
    'x-client-version': SERVER_VERSION,
    'User-Agent': `irctc-mcp/${SERVER_VERSION} (${process.platform}; ${process.arch})`,
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  let endpoint = '';

  switch (name) {
    case 'check_pnr': {
      const pnr = String(args.pnr || '').replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(pnr)) {
        throw new Error('Invalid PNR number. Must be exactly 10 digits.');
      }
      endpoint = `/api/v1/pnr/${encodeURIComponent(pnr)}`;
      break;
    }

    case 'get_live_running_status': {
      const trainNo = String(args.train_no || '').trim();
      if (!/^\d{4,5}$/.test(trainNo)) {
        throw new Error('Invalid train number. Must be 4 or 5 digits.');
      }
      const query = args.date ? `?date=${encodeURIComponent(args.date)}` : '';
      endpoint = `/api/v1/live/${encodeURIComponent(trainNo)}${query}`;
      break;
    }

    case 'search_trains': {
      const from = String(args.from || '').trim().toUpperCase();
      const to = String(args.to || '').trim().toUpperCase();
      if (!from || !to) {
        throw new Error('Both "from" and "to" station codes are required.');
      }
      const params = new URLSearchParams({ from, to });
      if (args.date) params.append('date', args.date);
      endpoint = `/api/v1/trains/search?${params.toString()}`;
      break;
    }

    case 'check_seat_availability': {
      const trainNo = String(args.train_no || '').trim();
      const from = String(args.from || '').trim().toUpperCase();
      const to = String(args.to || '').trim().toUpperCase();
      const date = String(args.date || '').trim();
      const classCode = String(args.class_code || '3A').trim().toUpperCase();
      const quota = String(args.quota || 'GN').trim().toUpperCase();

      if (!trainNo || !from || !to || !date) {
        throw new Error('train_no, from, to, and date (DD-MM-YYYY) are required.');
      }

      const params = new URLSearchParams({ from, to, date, class: classCode, quota });
      endpoint = `/api/v1/trains/${encodeURIComponent(trainNo)}/availability?${params.toString()}`;
      break;
    }

    case 'get_vacant_berths_post_chart': {
      const trainNo = String(args.train_no || '').trim();
      const boardingStation = String(args.boarding_station || '').trim().toUpperCase();
      const date = args.date ? String(args.date).trim() : '';
      const classCode = String(args.class_code || 'ALL').trim().toUpperCase();

      if (!trainNo || !boardingStation) {
        throw new Error('train_no and boarding_station are required.');
      }

      const params = new URLSearchParams({ boardingStation, class: classCode });
      if (date) params.append('date', date);
      endpoint = `/api/v1/trains/${encodeURIComponent(trainNo)}/chart-vacant?${params.toString()}`;
      break;
    }

    case 'get_train_fare': {
      const trainNo = String(args.train_no || '').trim();
      const from = String(args.from || '').trim().toUpperCase();
      const to = String(args.to || '').trim().toUpperCase();
      const travelClass = String(args.class_code || 'all').trim().toLowerCase();
      const quota = String(args.quota || 'GN').trim().toUpperCase();

      if (!trainNo || !from || !to) {
        throw new Error('train_no, from, and to station codes are required.');
      }

      const params = new URLSearchParams({ from, to, class: travelClass, quota });
      endpoint = `/api/v1/trains/${encodeURIComponent(trainNo)}/fare?${params.toString()}`;
      break;
    }

    case 'get_train_schedule': {
      const trainNo = String(args.train_no || '').trim();
      if (!/^\d{4,5}$/.test(trainNo)) {
        throw new Error('Invalid train number. Must be 4 or 5 digits.');
      }
      endpoint = `/api/v1/trains/${encodeURIComponent(trainNo)}`;
      break;
    }

    case 'get_train_by_number': {
      const trainNo = String(args.train_no || '').trim();
      if (!/^\d{4,5}$/.test(trainNo)) {
        throw new Error('Invalid train number. Must be 4 or 5 digits.');
      }
      endpoint = `/api/v1/trains/number/${encodeURIComponent(trainNo)}`;
      break;
    }

    case 'search_trains_by_name': {
      const nameQuery = String(args.name || '').trim();
      if (!nameQuery || nameQuery.length < 2) {
        throw new Error('Train name query is required (minimum 2 characters).');
      }
      endpoint = `/api/v1/trains/search/name?name=${encodeURIComponent(nameQuery)}`;
      break;
    }

    case 'get_station_timetable': {
      const stationCode = String(args.station_code || '').trim().toUpperCase();
      const date = String(args.date || '').trim();
      if (!stationCode || !date) {
        throw new Error('station_code and date are required.');
      }
      endpoint = `/api/v1/trains/stations/${encodeURIComponent(stationCode)}/timetable/${encodeURIComponent(date)}`;
      break;
    }

    case 'search_stations': {
      const q = String(args.query || '').trim();
      endpoint = `/api/v1/trains/stations?q=${encodeURIComponent(q)}`;
      break;
    }

    case 'get_station_by_code': {
      const stationCode = String(args.station_code || '').trim().toUpperCase();
      if (!stationCode) {
        throw new Error('station_code is required.');
      }
      endpoint = `/api/v1/trains/stations/${encodeURIComponent(stationCode)}`;
      break;
    }

    case 'get_cancelled_trains': {
      endpoint = `/api/v1/trains/cancelled`;
      break;
    }

    case 'get_engine_health': {
      endpoint = `/health`;
      break;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const errorMsg = body?.error || body?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(errorMsg);
  }

  if (name === 'get_engine_health') {
    return {
      status: body.status || 'up',
      version: body.version || '1.0.2',
    };
  }

  return body;
}

/**
 * Handle incoming JSON-RPC 2.0 Request
 */
async function handleRpcRequest(req) {
  const { id, method, params } = req;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION,
          },
        },
      };

    case 'notifications/initialized':
      // Client ack notification — no response needed
      return null;

    case 'ping':
      return {
        jsonrpc: '2.0',
        id,
        result: {},
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS,
        },
      };

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const resultData = await executeTool(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2),
              },
            ],
          },
        };
      } catch (err) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error executing ${toolName}: ${err.message}`,
              },
            ],
          },
        };
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

/**
 * Start the stdio JSON-RPC MCP server
 */
function startMcpServer(inStream = process.stdin, outStream = process.stdout) {
  const rl = readline.createInterface({
    input: inStream,
    output: outStream,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const rpcReq = JSON.parse(trimmed);
      const rpcRes = await handleRpcRequest(rpcReq);
      if (rpcRes) {
        outStream.write(JSON.stringify(rpcRes) + '\n');
      }
    } catch (parseErr) {
      const errRes = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${parseErr.message}`,
        },
      };
      outStream.write(JSON.stringify(errRes) + '\n');
    }
  });

  process.stderr.write(`[irctc-mcp] Server v${SERVER_VERSION} initialized on stdio. Tools: ${TOOLS.map(t => t.name).join(', ')}\n`);
}

module.exports = {
  SERVER_NAME,
  SERVER_VERSION,
  PROTOCOL_VERSION,
  TOOLS,
  handleRpcRequest,
  executeTool,
  startMcpServer,
};
