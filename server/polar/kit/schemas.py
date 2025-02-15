import json

from pydantic import BaseModel, SecretStr


class Schema(BaseModel):
    class Config:
        json_dumps = json.dumps
        json_loads = json.loads
        json_encoders = {SecretStr: lambda v: v.get_secret_value() if v else None}
