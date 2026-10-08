#!/usr/bin/env python3
"""Публикация выпуска «Патриота» в репозиторий сайта через GitHub REST API.

Запускает рутина-сборщик после того, как сохранила data/DATE.json:

    GITHUB_TOKEN=... python3 -I publish_issue.py data/2026-10-09.json

Нужен fine-grained токен только на этот репозиторий с правом Contents: Read and write.
Коммит в main запускает GitHub Actions: сборка и публикация сайта занимают 1–2 минуты.
Только стандартная библиотека Python. Токен никогда не печатается.
"""

import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

REPO = os.environ.get("PATRIOT_REPO", "egronaldosyc/patriot")
BRANCH = os.environ.get("PATRIOT_BRANCH", "main")
SITE = os.environ.get("PATRIOT_SITE", "https://egronaldosyc.github.io/patriot")
API = "https://api.github.com"


def fail(msg, code=1):
    print(f"ОШИБКА: {msg}", file=sys.stderr)
    sys.exit(code)


def request(method, url, token, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "patriot-publisher")
    req.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read().decode("utf-8") or "{}")
        except ValueError:
            payload = {}
        return e.code, payload


def main():
    if len(sys.argv) != 2:
        fail("укажите путь к файлу выпуска: publish_issue.py data/YYYY-MM-DD.json", 2)
    path = sys.argv[1]
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        fail("не задан GITHUB_TOKEN", 2)

    name = os.path.basename(path)
    m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})\.json", name)
    if not m:
        fail(f"имя файла должно быть YYYY-MM-DD.json, получено {name}", 2)
    date = m.group(1)

    try:
        with open(path, "rb") as f:
            raw = f.read()
        issue = json.loads(raw.decode("utf-8"))
    except (OSError, ValueError) as e:
        fail(f"файл выпуска не читается как JSON: {e}", 2)
    if not isinstance(issue, dict) or issue.get("date") != date:
        fail(f"поле date в файле ({issue.get('date') if isinstance(issue, dict) else '—'}) не совпадает с именем {date}", 2)
    if re.search("политрук", raw.decode("utf-8"), re.IGNORECASE):
        print("ВНИМАНИЕ: в выпуске встречается слово «Политрук» — проект называется «Патриот».", file=sys.stderr)

    target = f"{API}/repos/{REPO}/contents/data/{date}.json"
    title = (issue.get("title") or "").strip()
    message = f"Выпуск {date}" + (f": {title}" if title else "")
    content = base64.b64encode(raw).decode("ascii")

    for attempt in range(1, 5):
        status, current = request("GET", f"{target}?ref={BRANCH}", token)
        if status == 401 or status == 403:
            fail(f"GitHub отклонил токен (HTTP {status}): проверьте срок действия и право Contents: write")
        sha = current.get("sha") if status == 200 else None
        if status == 200 and current.get("content"):
            existing = base64.b64decode(current["content"])
            if existing == raw:
                print(f"Без изменений: data/{date}.json уже опубликован")
                return
        body = {"message": message, "content": content, "branch": BRANCH}
        if sha:
            body["sha"] = sha
        status, res = request("PUT", target, token, body)
        if status in (200, 201):
            commit = res.get("commit", {}).get("sha", "")[:7]
            print(f"Опубликовано: data/{date}.json, коммит {commit}")
            if SITE:
                print(f"Страница выпуска (через 1–2 минуты): {SITE.rstrip('/')}/{date}/")
            return
        if status in (409, 422, 500, 502, 503, 504) and attempt < 4:
            time.sleep(3 * attempt)
            continue
        fail(f"GitHub вернул HTTP {status}: {res.get('message', 'без описания')}")


if __name__ == "__main__":
    main()
