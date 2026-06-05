<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Inventory API') }}</title>
    <style>
        :root {
            color-scheme: light;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #172033;
            background: #f6f8fb;
        }

        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
        }

        main {
            width: min(92vw, 560px);
            padding: 32px;
            border: 1px solid #dce3ee;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 12px 36px rgba(23, 32, 51, 0.08);
        }

        h1 {
            margin: 0 0 12px;
            font-size: 28px;
            line-height: 1.2;
        }

        p {
            margin: 0 0 20px;
            color: #56657a;
        }

        dl {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px 16px;
            margin: 0;
            font-size: 14px;
        }

        dt {
            color: #6b778b;
        }

        dd {
            margin: 0;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <main>
        <h1>{{ config('app.name', 'Inventory API') }}</h1>
        <p>Backend API is running. Use the separate React frontend for the application UI.</p>
        <dl>
            <dt>Status</dt>
            <dd>Online</dd>
            <dt>Environment</dt>
            <dd>{{ app()->environment() }}</dd>
            <dt>API Prefix</dt>
            <dd>/api/v1</dd>
        </dl>
    </main>
</body>
</html>
