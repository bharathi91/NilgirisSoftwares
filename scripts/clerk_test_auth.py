import os, json, sys, urllib.request
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
SK = os.environ["CLERK_SECRET_KEY"]
USERS = json.load(open("/app/memory/.test_users.json"))


def bapi(path, body):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))


def token(email):
    s = bapi("/sessions", {"user_id": USERS[email]})
    return bapi(f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 3600})["jwt"]


def ticket(email):
    return bapi("/sign_in_tokens", {"user_id": USERS[email], "expires_in_seconds": 900})["token"]


if __name__ == "__main__":
    kind, email = sys.argv[1], sys.argv[2]
    print(token(email) if kind == "token" else ticket(email))
