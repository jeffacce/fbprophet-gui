// https://stackoverflow.com/questions/4492678/swap-rows-with-columns-transposition-of-a-matrix-in-javascript/13241545
function transpose(a) {

  // Calculate the width and height of the Array
  var w = a.length || 0;
  var h = a[0] instanceof Array ? a[0].length : 0;

  // In case it is a zero matrix, no transpose routine needed.
  if(h === 0 || w === 0) { return []; }

  /**
   * @var {Number} i Counter
   * @var {Number} j Counter
   * @var {Array} t Transposed data is stored in this array.
   */
  var i, j, t = [];

  // Loop through every item in the outer array (height)
  for(i=0; i<h; i++) {

    // Insert a new row (array)
    t[i] = [];

    // Loop through every item per item in outer array (width)
    for(j=0; j<w; j++) {

      // Save transposed data.
      t[i][j] = a[j][i];
    }
  }

  return t;
}

var raw = {};
var pred = {};
var pred_csv = null;


function parseData(text) {
    var result = Papa.parse(text, config={'dynamicTyping': true}).data;
    result = transpose(result);
    raw['x'] = result[0];
    raw['y'] = result[1];
    return result;
}


function renderChart(pred) {
    var ctx = $('#chart-prediction')[0].getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        options: {
            animation: {
                duration: 0,
            },
            hover: {
                animationDuration: 0,
            },
            responsiveAnimationDuration: 0, // animation duration after a resize
            elements: {
                line: {
                    tension: 0 // disables bezier curves
                }
            },
        },
        data: {
            labels: pred['ds'],
            datasets: [
                {
                    label: 'Prediction',
                    data: pred['yhat'],
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#4ea5ec",
                    borderColor: "#4ea5ec",
                },
                {
                    label: 'Upper bound',
                    data: pred['yhat_upper'],
                    fill: '+1',
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#b3ddff",
                    borderColor: "#b3ddff",
                },
                {
                    label: 'Lower bound',
                    data: pred['yhat_lower'],
                    fill: '-1',
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#b3ddff",
                    borderColor: "#b3ddff",
                },
                {
                    label: 'Trend',
                    data: pred['trend'],
                    fill: false,
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#1a0a94",
                    borderColor: "#1a0a94",
                },
                {
                    label: 'Yearly seasonality',
                    data: pred['yearly'],
                    fill: false,
                    hidden: true,
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#5e5e5e",
                    borderColor: "#5e5e5e",
                },
                {
                    label: 'Weekly seasonality',
                    data: pred['weekly'],
                    fill: false,
                    hidden: true,
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#5e5e5e",
                    borderColor: "#5e5e5e",
                },
                {
                    label: 'Daily seasonality',
                    data: pred['daily'],
                    fill: false,
                    hidden: true,
                    borderWidth: 0,
                    pointRadius: 1,
                    backgroundColor: "#5e5e5e",
                    borderColor: "#5e5e5e",
                },
            ],
        },
    });
}


function generateRequest() {
    var data = parseData($('#raw-data')[0].value);

    var result = {
        'ds': data[0],
        'y': data[1],
        'growth': $('input[name="growth"]:checked').val(),
        'n_changepoints': parseInt($('#n-changepoints-input').val()),
        'changepoint_range': parseFloat($('#changepoint-range-input').val()),
        'changepoint_prior_scale': parseFloat($('#changepoint-prior-scale-input').val()),
        'yearly_seasonality': $('#yearly-seasonality-input')[0].checked,
        'weekly_seasonality': $('#weekly-seasonality-input')[0].checked,
        'daily_seasonality': $('#daily-seasonality-input')[0].checked,
        'seasonality_mode': $('input[name="seasonality-mode"]:checked').val(),
        'seasonality_prior_scale': parseFloat($('#seasonality-prior-scale-input').val()),
        'mcmc_samples': parseInt($('#mcmc-samples-input').val()),
        'interval_width': parseFloat($('#interval-width-input').val()),
        'uncertainty_samples': parseInt($('#uncertainty-samples-input').val()),
        'periods': parseInt($('#periods-input').val()),
        'freq': $('#freq-input').val(),
        'include_history': $('#include-history-input').val(),
    };

    if (result['growth'] == 'logistic') {
        var floor = parseFloat($('#growth-log-floor-input').val()) || 0.0;
        var cap = parseFloat($('#growth-log-cap-input').val());  // (no default, must specify; should not be null)
        result['floor'] = Array(data[0].length).fill(floor);
        result['cap'] = Array(data[0].length).fill(cap);
    }

    if ($('#auto-seasonality-input')[0].checked) {
        result['yearly_seasonality'] = 'auto';
        result['weekly_seasonality'] = 'auto';
        result['daily_seasonality'] = 'auto';
    };
    if ($('#yearly-seasonality-input')[0].checked) {
        result['yearly_seasonality'] = parseInt($('#yearly-seasonality-order-input').val()) || 10;
    }
    if ($('#weekly-seasonality-input')[0].checked) {
        result['weekly_seasonality'] = parseInt($('#weekly-seasonality-order-input').val()) || 10;
    }
    if ($('#daily-seasonality-input')[0].checked) {
        result['daily_seasonality'] = parseInt($('#daily-seasonality-order-input').val()) || 10;
    }

    return result;
}


function parseResponse(text) {
    var result = {};
    var data = Papa.parse(text, config={'dynamicTyping': true}).data;
    var header = data[0];
    var data_t = transpose(data.slice(1,));
    for (i=0; i<header.length; i++) {
        result[header[i]] = data_t[i];
    }
    return result;
}


function sendRequest() {
    $.ajax('/prophet/api/v1/raw', {
        data: JSON.stringify(generateRequest()),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        method: 'POST',
        success: (data, status, xhr) => {
            pred_csv = JSON.parse(JSON.stringify(data));
            $('#submit-button')[0].disabled = false;
            $('#download-button')[0].disabled = false;
            $('#spinner-running')[0].hidden = true;
            renderChart(parseResponse(data));
        },
        error: () => {
            alert('Oops. Something broke!');
            $('#submit-button')[0].disabled = false;
            $('#download-button')[0].disabled = true;
            $('#spinner-running')[0].hidden = true;
        },
        timeout: 60000,
    });
}


function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}


function loadFileAsText(fileToLoad){
    var fileReader = new FileReader();
    fileReader.onload = function() {
        $("#raw-data")[0].value = fileReader.result;
        var data = parseData($("#raw-data")[0].value);
    }
    fileReader.readAsText(fileToLoad);
}


function checkValidity() {
    if ($('input[name="growth"]:checked').val() == 'logistic') {
        if (!$('#growth-log-cap-input').val()) {
            alert('Must specify logistic growth cap.')
            return false;
        }
    }
    return true;
}


$('#auto-seasonality-input').change(() => {
    var elem = $('#auto-seasonality-input')[0];
    $('#yearly-seasonality-input')[0].disabled = elem.checked;
    $('#weekly-seasonality-input')[0].disabled = elem.checked;
    $('#daily-seasonality-input')[0].disabled = elem.checked;
})


$('#raw-data-file-input').change(() => {
    var fileToRead = $("#raw-data-file-input")[0].files[0];
    loadFileAsText(fileToRead);
})

$("#raw-data").bind('input propertychange', () => {
    var data = parseData($("#raw-data")[0].value);
    renderChart(data[0], data[1]);
})

$('#submit-button').on('click', () => {
    checkValidity();
    sendRequest();
    $('#submit-button')[0].disabled = true;
    $('#download-button')[0].disabled = true;
    $("#spinner-running")[0].hidden = false;
})

$('#download-button').on('click', () => {
    download('prediction.csv', pred_csv);
})

var ctx = document.getElementById('chart-prediction').getContext('2d');
renderChart({});
