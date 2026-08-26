#include "timesync.h"
#include "config.h"

#include <time.h>

void timeSetup() {
  // UTC, no DST offset - the backend/frontend handle any local display conversion.
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);
}

String getIsoTimestamp(bool &synced) {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 250)) {
    synced = false;
    return "";
  }

  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  synced = true;
  return String(buf);
}
