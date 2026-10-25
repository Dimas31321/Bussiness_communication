"""Run with Python Playwright installed: python3 tests/security-smoke.py.
Starts its own loopback server and uses an isolated Chromium context.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'
payload = '</textarea><img src=x onerror="window.injected=true"><script>window.injected=true</script>&\"\''
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        for mode in ['train', 'exam']:
            page = browser.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(url + '/#test/mock-theory-40')
            page.locator(f'[data-mode={mode}]').click()
            page.locator('[data-index="38"]').click()
            page.locator('#open-answer').fill(payload)
            page.reload()
            page.wait_for_selector('#open-answer')
            assert page.locator('#open-answer').input_value() == payload
            # Question/model content is text too, even if a data source contains HTML.
            page.evaluate('(value) => { questionMap.get(session.ids[session.index]).explanation = value; }', payload)
            page.locator('[data-action=ready]').click()
            assert page.locator('.open-model p').text_content() == payload
            assert page.locator('#open-answer').is_disabled()
            page.locator('[data-action=self-wrong]').click()
            page.locator('[data-action=finish]').first.click()
            page.locator('#confirm-submit').click()
            page.wait_for_selector('[data-open-response]', state='attached')
            assert page.locator('[data-open-response]').first.text_content() == payload
            assert not page.evaluate('window.injected === true')
            assert page.locator('img, script:not([src])').count() == 0
            assert not errors, errors
            page.close()
            print('PASS:', mode, 'HTML remains literal text in input, model, and results')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
