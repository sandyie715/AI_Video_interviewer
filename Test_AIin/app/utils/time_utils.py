from datetime import datetime, timedelta, timezone
import zoneinfo

# Define Indian Standard Time (IST) timezone
# Reason: Interview times are expected to be provided in IST
IST = zoneinfo.ZoneInfo("Asia/Kolkata")


# Convert ISO datetime string (assumed IST) to UTC
# Reason: Store all timestamps in UTC for consistency
def parse_to_utc(dt_str):
    local_dt = datetime.fromisoformat(dt_str)
    local_dt = local_dt.replace(tzinfo=IST)
    return local_dt.astimezone(timezone.utc)