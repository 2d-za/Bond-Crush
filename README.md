# Simple Bond Calculator to determine the rate at which a bond will be paid off with extra payments

A simple static web calculator for South African home loans (bonds).

Enter your purchase price, deposit, interest rate, and loan term to see your
standard monthly repayment. Add an additional monthly payment to see the new
(shorter) loan term, the total interest saved, and the total amount you'd end
up paying compared to just paying the standard repayment.

## Running it

No build step is required — it's plain HTML/CSS/JS. Serve the folder with
any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`.

## Files

- `index.html` — page markup and input form
- `css/style.css` — styling
- `js/bond-calculator.js` — calculation logic (amortization math), usable in
  Node or the browser
- `js/script.js` — wires the form inputs to the calculator and renders results
