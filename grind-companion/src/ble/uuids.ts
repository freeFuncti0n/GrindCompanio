/** BLE UUIDs matching smart-grind-by-weight src/config/bluetooth.h */

export const DEVICE_NAME = 'GrindByWeight';

export const BLE_DATA_SERVICE_UUID = '22334455-6677-8899-aabb-ccddeeffffaa';
export const BLE_DATA_CONTROL_CHAR_UUID = '33445566-7788-99aa-bbcc-ddeeffaabbcc';
export const BLE_DATA_TRANSFER_CHAR_UUID = '44556677-8899-aabb-ccdd-eeffaabbccdd';
export const BLE_DATA_STATUS_CHAR_UUID = '55667788-99aa-bbcc-ddee-ffaabbccddee';

export const BLE_SYSINFO_SERVICE_UUID = '77889900-aabb-ccdd-eeff-112233445566';
export const BLE_SYSINFO_SYSTEM_CHAR_UUID = '88990011-bbcc-ddee-ff11-223344556677';
export const BLE_SYSINFO_SESSIONS_CHAR_UUID = '11223344-eeff-1122-3344-556677889900';

export const BLE_LIVE_SERVICE_UUID = 'aabbccdd-eeff-0011-2233-445566778899';
export const BLE_LIVE_TELEMETRY_CHAR_UUID = 'bbccddee-ff00-1122-3344-556677889900';
export const BLE_LIVE_CONTROL_CHAR_UUID = 'ccddeeff-0011-2233-4455-667788990011';

export const BLE_DATA_CMD_STOP_EXPORT = 0x11;
export const BLE_DATA_CMD_GET_COUNT = 0x12;
export const BLE_DATA_CMD_CLEAR_DATA = 0x13;
export const BLE_DATA_CMD_GET_FILE_LIST = 0x14;
export const BLE_DATA_CMD_REQUEST_FILE = 0x15;

export const BLE_DATA_IDLE = 0x20;
export const BLE_DATA_EXPORTING = 0x21;
export const BLE_DATA_COMPLETE = 0x22;
export const BLE_DATA_ERROR = 0x23;

export const BLE_LIVE_CMD_ENABLE = 0x01;
export const BLE_LIVE_CMD_DISABLE = 0x02;
export const BLE_LIVE_CMD_START_GRIND = 0x10;
export const BLE_LIVE_CMD_STOP_GRIND = 0x11;
export const BLE_LIVE_CMD_CONTINUE_PURGE = 0x12;
export const BLE_LIVE_CMD_RETURN_IDLE = 0x13;

export const PHASE_IDLE = 0;
export const PHASE_COMPLETED = 12;
export const PHASE_TIMEOUT = 13;
export const PHASE_PURGE_CONFIRM = 16;
