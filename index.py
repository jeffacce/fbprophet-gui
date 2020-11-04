from flask import Flask, request, abort, render_template
from flask_cachebuster import CacheBuster
import pandas as pd
import numpy as np
from fbprophet import Prophet
import time
import json


app = Flask(__name__)
config = {
    'extensions': ['.js', '.html', '.css'],
    'hash_size': 5,
}
cache_buster = CacheBuster(config=config)
cache_buster.init_app(app)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/prophet/api/v1/raw', methods=['POST'])
def handle_raw():
    valid = (
        request.json
        and ('ds' in request.json)
        and ('y' in request.json)
        and (len(request.json['ds']) == len(request.json['y']))
    )
    if not valid:
        abort(400)
    
    m = Prophet(
        growth=request.json.get('growth', 'linear'),
        n_changepoints=int(request.json.get('n_changepoints', 25)),
        changepoint_range=float(request.json.get('changepoint_range', 0.8)),
        changepoint_prior_scale=float(request.json.get('changepoint_prior_scale', 0.05)),
        yearly_seasonality=request.json.get('yearly_seasonality', 'auto'),
        weekly_seasonality=request.json.get('weekly_seasonality', 'auto'),
        daily_seasonality=request.json.get('daily_seasonality', 'auto'),
        seasonality_mode=request.json.get('seasonality_mode', 'additive'),
        seasonality_prior_scale=float(request.json.get('seasonality_prior_scale', 10.0)),
        mcmc_samples=int(request.json.get('mcmc_samples', 0)),
        interval_width=float(request.json.get('interval_width', 0.8)),
        uncertainty_samples=int(request.json.get('uncertainty_samples', 1000)),
    )

    monthly_seasonality = request.json.get('monthly_seasonality')
    if monthly_seasonality:
        if monthly_seasonality == True:
            monthly_seasonality = 10
        m.add_seasonality(period=30.4375, fourier_order=monthly_seasonality, name='monthly')

    df = pd.DataFrame(request.json).dropna()
    df['ds'] = pd.to_datetime(df['ds'])
    for col in ['cap', 'floor', 'y']:
        if col in df:
            df[col] = df[col].astype(float)
    m.fit(df)
    
    future = m.make_future_dataframe(
        periods=int(request.json.get('periods', 0)),
        freq=request.json.get('freq', 'D'),
        include_history=request.json.get('include_history', True),
    )
    if 'cap' in df:
        future['cap'] = df['cap'].iloc[0]
    if 'floor' in df:
        future['floor'] = df['floor'].iloc[0]

    forecast = m.predict(future)
    result = forecast.to_csv(encoding='utf-8-sig', sep=',', index=False)
    return json.dumps(result), 200


if __name__ == '__main__':
    app.run(debug=True)

