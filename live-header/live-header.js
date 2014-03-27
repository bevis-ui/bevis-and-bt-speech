(function () {

    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    var jsonTextarea = document.getElementById('live-header-code');
    jsonTextarea.addEventListener('keydown', function (e) {
        if (e.keyCode === 9) {
            var start = this.selectionStart;
            var end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            e.preventDefault();
            e.stopPropagation();
        } else {
            e.stopPropagation();
        }
    });

    var demoElement = document.getElementById('live-header-demo');

    function renderHeader() {
        var jsonText = jsonTextarea.value;
        var btJson;
        var html = '';
//        try {
            btJson = eval('(' + jsonText + ')');
            html = window.yHeaderBT.apply(btJson);
//        } catch (e) {
//            return; // ignore errors
//        }
        demoElement.innerHTML = html;
    }

    var renderHeaderDelayed = debounce(renderHeader, 300);
    jsonTextarea.addEventListener('keyup', renderHeaderDelayed);
    renderHeader();
})();

