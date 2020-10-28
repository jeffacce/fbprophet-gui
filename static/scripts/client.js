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


function generateRequest() {
    var data = Papa.parse($('#raw-data')[0].value, config={'dynamicTyping': true}).data;
    data = transpose(data);

    var result = {
        'ds': data[0],
        'y': data[1],
        'growth': $('input[name="growth"]:checked').val(),
        'n_changepoints': $('#n-changepoints-input').val(),
        'changepoint_range': $('#changepoint-range-input').val(),
        'changepoint_prior_scale': $('#changepoint-prior-scale-input').val(),
        'yearly_seasonality': $('#yearly-seasonality-input')[0].checked,
        'weekly_seasonality': $('#weekly-seasonality-input')[0].checked,
        'daily_seasonality': $('#daily-seasonality-input')[0].checked,
        'seasonality_mode': $('input[name="seasonality-mode"]:checked').val(),
        'seasonality_prior_scale': $('#seasonality-prior-scale-input').val(),
        'mcmc_samples': $('#mcmc-samples-input').val(),
        'interval_width': $('#interval-width-input').val(),
        'uncertainty_samples': $('#uncertainty-samples-input').val(),
        'periods': $('#periods-input').val(),
        'freq': $('#freq-input').val(),
        'include_history': $('#include-history-input').val(),
    };

    if ($('#auto-seasonality-input')[0].checked) {
        result['yearly_seasonality'] = 'auto';
        result['weekly_seasonality'] = 'auto';
        result['daily_seasonality'] = 'auto';
    };
    if ($('#yearly-seasonality-input')[0].checked) {
        result['yearly_seasonality'] = $('#yearly-seasonality-order-input').val();
    }
    if ($('#weekly-seasonality-input')[0].checked) {
        result['weekly_seasonality'] = $('#weekly-seasonality-order-input').val();
    }
    if ($('#daily-seasonality-input')[0].checked) {
        result['daily_seasonality'] = $('#daily-seasonality-order-input').val();
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
            download('prediction.csv', data);
            $('#submit-button')[0].disabled = false;
            $('#spinner-running')[0].hidden = true;
        },
        error: () => {
            alert('Oops. Something broke!');
            $('#submit-button')[0].disabled = false;
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
        return fileReader.result;
    }
    fileReader.readAsText(fileToLoad);
}


$('#auto-seasonality-input').change(() => {
    var elem = $('#auto-seasonality-input')[0];
    $('#yearly-seasonality-input')[0].disabled = elem.checked;
    $('#weekly-seasonality-input')[0].disabled = elem.checked;
    $('#daily-seasonality-input')[0].disabled = elem.checked;
})


$('#raw-data-file-input').change(() => {
    var fileToRead = $("#raw-data-file-input")[0].files[0];
    var txt = loadFileAsText(fileToRead);
})

$('#submit-button').on('click', () => {
    sendRequest();
    $('#submit-button')[0].disabled = true;
    $("#spinner-running")[0].hidden = false;
})
