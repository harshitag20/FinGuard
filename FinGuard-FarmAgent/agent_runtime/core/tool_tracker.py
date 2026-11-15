from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class ToolExecutionTracker:
    def __init__(self):
        self._executions: List[Dict[str, Any]] = []

    def record_execution(self, tool_name: str, args: Dict[str, Any], status: str = "success", error: Optional[str] = None):
        # Sanitize sensitive arguments if any
        sanitized_args = {}
        for k, v in args.items():
            if any(secret_term in k.lower() for secret_term in ["key", "token", "secret", "password"]):
                sanitized_args[k] = "[REDACTED]"
            else:
                sanitized_args[k] = v

        self._executions.append({
            "tool": tool_name,
            "args": sanitized_args,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": status,
            "error": error
        })

    @property
    def executions(self) -> List[Dict[str, Any]]:
        return list(self._executions)

    @property
    def tool_names(self) -> List[str]:
        # Return unique tool names preserving order
        seen = set()
        res = []
        for e in self._executions:
            t = e["tool"]
            if t not in seen:
                seen.add(t)
                res.append(t)
        return res

    def clear(self):
        self._executions.clear()

