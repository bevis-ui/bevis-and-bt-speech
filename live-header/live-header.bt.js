(function () {

    var BT = (function() {

        /**
         * BT: BtJson -> HTML процессор.
         * @constructor
         */
        function BT() {
            /**
             * Используется для идентификации матчеров.
             * Каждому матчеру дается уникальный id для того, чтобы избежать повторного применения
             * матчера к одному и тому же узлу BtJson-дерева.
             * @type {Number}
             * @private
             */
            this._lastMatchId = 0;
            /**
             * Плоский массив для хранения матчеров.
             * Каждый элемент — массив с двумя элементами: [{String} выражение, {Function} матчер}]
             * @type {Array}
             * @private
             */
            this._matchers = {};
            /**
             * Отображения по умолчанию для блоков.
             * @type {Object}
             * @private
             */
            this._defaultViews = {};
            /**
             * Флаг, включающий автоматическую систему поиска зацикливаний. Следует использовать в development-режиме,
             * чтобы определять причины зацикливания.
             * @type {Boolean}
             * @private
             */
            this._infiniteLoopDetection = false;

            /**
             * Неймспейс для библиотек. Сюда можно писать различный функционал для дальнейшего использования в матчерах.
             * ```javascript
             * bt.lib.objects = bt.lib.objects || {};
             * bt.lib.objects.inverse = bt.lib.objects.inverse || function(obj) { ... };
             * ```
             * @type {Object}
             */
            this.lib = {};
            /**
             * Опции BT. Задаются через setOptions.
             * @type {Object}
             */
            this._options = {};
            this.utils = {

                _lastGenId: 0,

                bt: this,

                /**
                 * Возвращает позицию элемента в рамках родителя.
                 * Отсчет производится с 1 (единицы).
                 *
                 * ```javascript
                 * bt.match('list__item', function(ctx) {
                 *     if (ctx.position() === 2) {
                 *         ctx.setState('is-second');
                 *     }
                 * });
                 * ```
                 * @returns {Number}
                 */
                getPosition: function () {
                    var node = this.node;
                    return node.index === '_content' ? 1 : node.index + 1;
                },

                /**
                 * Возвращает true, если текущий bemjson-элемент первый в рамках родительского bemjson-элемента.
                 *
                 * ```javascript
                 * bt.match('list__item', function(ctx) {
                 *     if (ctx.isFirst()) {
                 *         ctx.setState('is-first');
                 *     }
                 * });
                 * ```
                 * @returns {Boolean}
                 */
                isFirst: function () {
                    var node = this.node;
                    return node.index === '_content' || node.index === 0;
                },

                /**
                 * Возвращает true, если текущий bemjson-элемент последний в рамках родительского bemjson-элемента.
                 *
                 * ```javascript
                 * bt.match('list__item', function(ctx) {
                 *     if (ctx.isLast()) {
                 *         ctx.setState('is-last');
                 *     }
                 * });
                 * ```
                 * @returns {Boolean}
                 */
                isLast: function () {
                    var node = this.node;
                    return node.index === '_content' || node.index === node.arr.length - 1;
                },

                // --- HTML ---

                /**
                 * Устанавливает тег.
                 *
                 * @param tagName
                 * @returns {String|undefined}
                 */
                setTag: function (tagName) {
                    this.ctx._tag = tagName;
                    return this;
                },

                /**
                 * Возвращает тег.
                 *
                 * @returns {Ctx}
                 */
                getTag: function () {
                    return this.ctx._tag;
                },

                /**
                 * Устанавливает значение атрибута.
                 *
                 * @param {String} attrName
                 * @param {String} attrValue
                 */
                setAttr: function (attrName, attrValue) {
                    (this.ctx._attrs || (this.ctx._attrs = {}))[attrName] = attrValue;
                    return this;
                },

                /**
                 * Возвращает значение атрибута.
                 *
                 * @param {String} attrName
                 * @returns {Ctx}
                 */
                getAttr: function (attrName) {
                    return this.ctx._attrs ? this.ctx._attrs[attrName] : undefined;
                },

                /**
                 * Отключает генерацию атрибута `class`.
                 *
                 * @returns {Ctx}
                 */
                disableCssClassGeneration: function () {
                    this.ctx._disableCssGeneration = true;
                    return this;
                },

                /**
                 * Включает генерацию атрибута `class`. По умолчанию — включено.
                 *
                 * @returns {Ctx}
                 */
                enableCssClassGeneration: function () {
                    this.ctx._disableCssGeneration = false;
                    return this;
                },

                /**
                 * Возвращает `true` если генерация атрибута `class` включена.
                 *
                 * @returns {Boolean}
                 */
                isCssClassGenerationEnabled: function () {
                    return !Boolean(this.ctx._disableCssGeneration);
                },

                /**
                 * Отключает генерацию дополнительных data-атрибутов.
                 *
                 * @returns {Ctx}
                 */
                disableDataAttrGeneration: function () {
                    this.ctx._disableDataAttrGeneration = true;
                    return this;
                },

                /**
                 * Включает генерацию дополнительных data-атрибутов.
                 *
                 * @returns {Ctx}
                 */
                enableDataAttrGeneration: function () {
                    this.ctx._disableDataAttrGeneration = false;
                    return this;
                },

                /**
                 * Возвращает `true` если генерация дополнительных data-атрибутов включена.
                 *
                 * @returns {Boolean}
                 */
                isDataAttrGenerationEnabled: function () {
                    return !Boolean(this.ctx._disableDataAttrGeneration);
                },

                // --- BEViS ---

                /**
                 * Возвращает состояние по его имени.
                 *
                 * @param {String} stateName
                 * @returns {String|Boolean|undefined}
                 */
                getState: function (stateName) {
                    return this.ctx._state ? this.ctx._state[stateName] : undefined;
                },

                /**
                 * Устанавливает значение состояния.
                 *
                 * @param {String} stateName
                 * @param {String|Boolean|null} stateValue
                 * @returns {Ctx}
                 */
                setState: function (stateName, stateValue) {
                    (this.ctx._state || (this.ctx._state = {}))[stateName] =
                        arguments.length === 1 ? true : stateValue;
                    return this;
                },

                /**
                 * Возвращает значение параметра (btjson).
                 *
                 * @param {String} paramName
                 * @returns {*|undefined}
                 */
                getParam: function (paramName) {
                    return this.ctx[paramName];
                },

                /**
                 * Возвращает значение view.
                 *
                 * @returns {String|undefined}
                 */
                getView: function () {
                    return this.ctx.view;
                },

                /**
                 * Возвращает имя блока.
                 *
                 * @returns {String}
                 */
                getBlockName: function () {
                    return this.ctx.block;
                },

                /**
                 * Возвращает имя элемента, если матчинг происходит на элемент.
                 *
                 * @returns {String|undefined}
                 */
                getElementName: function () {
                    return this.ctx.elem;
                },

                /**
                 * Устанавливает содержимое.
                 *
                 * @param {BtJson} content
                 * @returns {Ctx}
                 */
                setContent: function (content) {
                    this.ctx._content = content;
                    return this;
                },

                /**
                 * Возвращает содержимое.
                 *
                 * @returns {BtJson|undefined}
                 */
                getContent: function () {
                    return this.ctx._content;
                },

                /**
                 * Возвращает набор миксинов, либо `undefined`.
                 *
                 * @returns {BtJson[]|undefined}
                 */
                getMixins: function () {
                    return this.ctx.mixins;
                },

                /**
                 * Добавляет миксин.
                 *
                 * @param {BtJson} mixin
                 * @returns {Ctx}
                 */
                addMixin: function (mixin) {
                    (this.ctx.mixins || (this.ctx.mixins = [])).push(mixin);
                    return this;
                },

                /**
                 * Включает автоматическую инициализацию.
                 *
                 * @returns {Ctx}
                 */
                enableAutoInit: function () {
                    if (this.ctx.autoInit !== false) {
                        this.ctx.autoInit = true;
                    }
                    return this;
                },

                /**
                 * Возвращает `true`, если для данного элемента включена автоматическая инициализация.
                 *
                 * @returns {Boolean}
                 */
                isAutoInitEnabled: function () {
                    return Boolean(this.ctx.autoInit);
                },

                /**
                 * Устанавливает опцию, которая передается в JS-блок при инициализации.
                 *
                 * @param {String} optName
                 * @param {*} optValue
                 * @returns {Ctx}
                 */
                setInitOption: function (optName, optValue) {
                    (this.ctx._initOptions || (this.ctx._initOptions = {}))[optName] = optValue;
                    return this;
                },

                /**
                 * Возвращает значение опции, которая передается в JS-блок при инициализации.
                 *
                 * @param {String} optName
                 * @returns {*}
                 */
                getInitOption: function (optName) {
                    return this.ctx._initOptions ? this.ctx._initOptions[optName] : undefined;
                },

                /**
                 * Возвращает уникальный идентификатор. Может использоваться, например,
                 * чтобы задать соответствие между `label` и `input`.
                 * @returns {String}
                 */
                generateId: function () {
                    return 'uniq' + (this._lastGenId++);
                },

                /**
                 * Останавливает выполнение прочих матчеров для данного bemjson-элемента.
                 *
                 * Пример:
                 * ```javascript
                 * bt.match('button', function(ctx) {
                 *     ctx.setTag('button');
                 * });
                 * bt.match('button', function(ctx) {
                 *     ctx.setTag('span');
                 *     ctx.stop();
                 * });
                 * ```
                 * @returns {Ctx}
                 */
                stop: function () {
                    this.ctx._stop = true;
                    return this;
                },

                /**
                 * Выполняет преобразования данного bemjson-элемента остальными матчерами.
                 * Может понадобиться, например, чтобы добавить элемент в самый конец содержимого,
                 * если в базовых шаблонах в конец содержимого добавляются другие элементы.
                 *
                 * Предоставляет минимальный функционал доопределения в рамках библиотеки.
                 *
                 * @returns {Ctx}
                 */
                applyTemplates: function () {
                    var prevCtx = this.ctx,
                        prevNode = this.node;
                    var res = this.bt.processBtJson(this.ctx, this.ctx.block, true);
                    if (res !== prevCtx) {
                        this.newCtx = res;
                    }
                    this.ctx = prevCtx;
                    this.node = prevNode;
                    return this;
                },

                /**
                 * Возвращает текущий фрагмент BtJson-дерева.
                 * Может использоваться в связке с `return` для враппинга и подобных целей.
                 * ```javascript
                 *
                 * bt.match('input', function(ctx) {
                 *     return {
                 *         elem: 'wrapper',
                 *         content: ctx.getJson()
                 *     };
                 * });
                 * ```
                 * @returns {Object|Array}
                 */
                getJson: function () {
                    return this.newCtx || this.ctx;
                },

                /**
                 * Экранирует HTML.
                 *
                 * @param {String} val
                 * @return {String}
                 */
                escape: function (val) {
                    return ('' + val)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#x27;')
                        .replace(/\//g,'&#x2F;');
                }
            };
        }

        BT.prototype = {
            /**
             * Включает/выключает механизм определения зацикливаний.
             *
             * @param {Boolean} enable
             * @returns {BT}
             */
            enableInfiniteLoopDetection: function(enable) {
                this._infiniteLoopDetection = enable;
                return this;
            },

            /**
             * Преобразует BtJson в HTML-код.
             * @param {Object|Array|String} btJson
             */
            apply: function (btJson) {
                return this.toHtml(this.processBtJson(btJson));
            },

            /**
             * Объявляет матчер.
             *
             * ```javascript
             * bt.match('b-page', function(ctx) {
             *     ctx.addMixin({ block: 'i-ua' });
             *     ctx.setAttr('class', 'i-ua_js_no i-ua_css_standard');
             * });
             * bt.match('block_mod_modVal', function(ctx) {
             *     ctx.setTag('span');
             * });
             * bt.match('block__elem', function(ctx) {
             *     ctx.setAttr('disabled', 'disabled');
             * });
             * bt.match('block__elem_elemMod_elemModVal', function(ctx) {
             *     ctx.setState('is-active');
             * });
             * bt.match('block_blockMod_blockModVal__elem', function(ctx) {
             *     ctx.setContent({
             *         elem: 'wrapper',
             *         content: ctx.getJson()
             *     };
             * });
             * ```
             * @param {String|Array} expr
             * @param {Function} matcher
             * @returns {Ctx}
             */
            match: function (expr, matcher) {
                matcher.__id = '__func' + (this._lastMatchId++);
                if (Array.isArray(expr)) {
                    for (var i = 0, l = expr.length; i < l; i++) {
                        (this._matchers[expr[i]] || (this._matchers[expr[i]] = [])).unshift(matcher);
                    }
                } else {
                    (this._matchers[expr] || (this._matchers[expr] = [])).unshift(matcher);
                }
                return this;
            },

            /**
             * Устанавливает отображение по умолчанию для блока.
             *
             * @param {String} blockName
             * @param {String} viewName
             * @returns {BT}
             */
            setDefaultView: function (blockName, viewName) {
                this._defaultViews[blockName] = viewName;
                return this;
            },

            /**
             * Раскрывает BtJson, превращая его из краткого в полный.
             * @param {Object|Array} btJson
             * @param {String} [blockName]
             * @param {Boolean} [ignoreContent]
             * @returns {Object|Array}
             */
            processBtJson: function (btJson, blockName, ignoreContent) {
                var resultArr = [btJson];
                var nodes = [{ json: btJson, arr: resultArr, index: 0, blockName: blockName }];
                var node, json, block, blockView, i, l, p, child, subRes;
                var matchers = this._matchers;
                var processContent = !ignoreContent;
                var infiniteLoopDetection = this._infiniteLoopDetection;

                /**
                 * Враппер для json-узла.
                 * @constructor
                 */
                function Ctx() {
                    this.ctx = null;
                    this.newCtx = null;
                }
                Ctx.prototype = this.utils;
                var ctx = new Ctx();
                while (node = nodes.shift()) {
                    json = node.json;
                    block = node.blockName;
                    blockView = node.blockView;
                    if (Array.isArray(json)) {
                        for (i = 0, l = json.length; i < l; i++) {
                            child = json[i];
                            if (child !== false && child != null && typeof child === 'object') {
                                nodes.push({ json: child, arr: json, index: i, blockName: block, blockView: blockView });
                            }
                        }
                    } else {
                        var content, stopProcess = false;
                        if (json.elem) {
                            if (json.block && json.block !== block) {
                                block = json.block;
                                blockView = json.view = json.view || this._defaultViews[block];
                            } else {
                                block = json.block = json.block || block;
                                blockView = json.view = json.view || blockView || this._defaultViews[block];
                            }
                        } else if (json.block) {
                            block = json.block;
                            blockView = json.view = json.view || this._defaultViews[block];
                        }

                        if (json.block) {

                            if (infiniteLoopDetection) {
                                json.__processCounter = (json.__processCounter || 0) + 1;
                                if (json.__processCounter > 100) {
                                    throw new Error(
                                        'Infinite loop detected at "' + json.block + (json.elem ? '__' + json.elem : '') + '".'
                                    );
                                }
                            }

                            subRes = null;

                            if (!json._stop) {
                                ctx.node = node;
                                ctx.ctx = json;
                                var selectorPostfix = json.elem ? '__' + json.elem : '';

                                var matcherList = matchers[json.block + (json.view ? '_' + json.view : '') + selectorPostfix];
                                if (!matcherList && json.view) {
                                    matcherList = matchers[json.block + '_' + json.view.split('-')[0] + '*' + selectorPostfix];
                                }
                                if (!matcherList) {
                                    matcherList = matchers[json.block + '*' + selectorPostfix];
                                }

                                if (matcherList) {
                                    for (i = 0, l = matcherList.length; i < l; i++) {
                                        var matcher = matcherList[i], mid = matcher.__id;
                                        if (!json[mid]) {
                                            json[mid] = true;
                                            subRes = matcher(ctx);
                                            if (subRes != null) {
                                                json = subRes;
                                                node.json = json;
                                                node.blockName = block;
                                                node.blockView = blockView;
                                                nodes.push(node);
                                                stopProcess = true;
                                                break;
                                            }
                                            if (json._stop) {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                        }

                        if (!stopProcess) {
                            if (Array.isArray(json)) {
                                node.json = json;
                                node.blockName = block;
                                node.blockView = blockView;
                                nodes.push(node);
                            } else {
                                if (processContent && ((content = json._content) != null)) {
                                    if (Array.isArray(content)) {
                                        var flatten;
                                        do {
                                            flatten = false;
                                            for (i = 0, l = content.length; i < l; i++) {
                                                if (Array.isArray(content[i])) {
                                                    flatten = true;
                                                    break;
                                                }
                                            }
                                            if (flatten) {
                                                json._content = content = content.concat.apply([], content);
                                            }
                                        } while (flatten);
                                        for (i = 0, l = content.length, p = l - 1; i < l; i++) {
                                            child = content[i];
                                            if (child !== false && child != null && typeof child === 'object') {
                                                nodes.push({
                                                    json: child, arr: content, index: i, blockName: block, blockView: blockView
                                                });
                                            }
                                        }
                                    } else {
                                        nodes.push({
                                            json: content, arr: json, index: '_content', blockName: block, blockView: blockView
                                        });
                                    }
                                }
                            }
                        }
                    }
                    node.arr[node.index] = json;
                }
                return resultArr[0];
            },

            /**
             * Превращает раскрытый BtJson в HTML.
             * @param {Object|Array|String} json
             * @returns {String}
             */
            toHtml: function (json) {
                var res, i, l, item;
                if (json === false || json == null) return '';
                if (typeof json !== 'object') {
                    return json;
                } else if (Array.isArray(json)) {
                    res = '';
                    for (i = 0, l = json.length; i < l; i++) {
                        item = json[i];
                        if (item !== false && item != null) {
                            res += this.toHtml(item);
                        }
                    }
                    return res;
                } else {
                    var jattr,
                        attrs = json._disableDataAttrGeneration || json.elem || !json.block ?
                            '' :
                            ' data-block="' + json.block + '"', initOptions;

                    if (jattr = json._attrs) {
                        for (i in jattr) {
                            var attrVal = jattr[i];
                            if (attrVal === true) {
                                attrs += ' ' + i;
                            } else if (attrVal != null) {
                                 attrs += ' ' + i + '="' + escapeAttr(jattr[i]) + '"';
                            }
                        }
                    }

                    if (json._initOptions) {
                        (initOptions = {}).options = json._initOptions;
                    }

                    var mixins = json.mixins;
                    if (mixins && mixins.length) {
                        (initOptions || (initOptions = {})).mixins = mixins;
                    }

                    if (initOptions) {
                        attrs += ' data-options="' + escapeAttr(JSON.stringify(initOptions)) + '"';
                    }

                    var content, tag = (json._tag || 'div');
                    res = '<' + tag;

                    if (!json._disableCssGeneration) {
                        res += ' class="';
                        res += (json.block) +
                            (json.view ? '_' + json.view : '') +
                            (json.elem ? '__' + json.elem : '');

                        var state = json._state;
                        if (state) {
                            for (i in state) {
                                var stateVal = state[i];
                                if (stateVal != null && stateVal !== '' && stateVal !== false) {
                                    if (stateVal === true) {
                                        res += ' _' + i;
                                    } else {
                                        res += ' _' + i + '_' + stateVal;
                                    }
                                }
                            }
                        }

                        if (json.autoInit || (mixins && mixins.length > 0)) {
                            res += ' _init';
                        }

                        res += '"';
                    }

                    res += attrs;

                    if (selfCloseHtmlTags[tag]) {
                        res += '/>';
                    } else {
                        res += '>';
                        if ((content = json._content) != null) {
                            if (Array.isArray(content)) {
                                for (i = 0, l = content.length; i < l; i++) {
                                    item = content[i];
                                    if (item !== false && item != null) {
                                        res += this.toHtml(item);
                                    }
                                }
                            } else {
                                res += this.toHtml(content);
                            }
                        }
                        res += '</' + tag + '>';
                    }
                    return res;
                }
            }
        };

        var selfCloseHtmlTags = {
            area: 1,
            base: 1,
            br: 1,
            col: 1,
            command: 1,
            embed: 1,
            hr: 1,
            img: 1,
            input: 1,
            keygen: 1,
            link: 1,
            meta: 1,
            param: 1,
            source: 1,
            wbr: 1
        };

        var escapeAttr = function (attrVal) {
            attrVal += '';
            if (~attrVal.indexOf('&')) {
                attrVal = attrVal.replace(/&/g, '&amp;');
            }
            if (~attrVal.indexOf('"')) {
                attrVal = attrVal.replace(/"/g, '&quot;');
            }
            return attrVal;
        };

        return BT;
    })();

    var bt = new BT();

    // begin: ../../blocks/common/y-page/y-page.bt.js


        /**
         * @param {Bemjson} body Содержимое страницы. Следует использовать вместо `content`.
         * @param {String} doctype Доктайп. По умолчанию используется HTML5 doctype.
         * @param {Object[]} styles Набор CSS-файлов для подключения.
         *                          Каждый элемент массива должен содержать ключ `url`, содержащий путь к файлу.
         * @param {Object[]} scripts Набор JS-файлов для подключения.
         *                           Каждый элемент массива должен содержать ключ `url`, содержащий путь к файлу.
         * @param {Bemjson} head Дополнительные элементы для заголовочной части страницы.
         * @param {String} favicon Путь к фавиконке.
         */

        bt.setDefaultView('y-page', 'islet');

        bt.match('y-page_islet*', function (ctx) {
            var styleElements;
            var styles = ctx.getParam('styles');
            if (styles) {
                styleElements = styles.map(function (style) {
                    return {
                        elem: 'css',
                        url: style.url,
                        ie: style.ie
                    };
                });
            }
            return [
                ctx.getParam('doctype') || '<!DOCTYPE html>',
                {
                    elem: 'html',
                    content: [
                        {
                            elem: 'head',
                            content: [
                                [
                                    {
                                        elem: 'meta',
                                        charset: 'utf-8'
                                    },
                                    ctx.getParam('x-ua-compatible') === false ?
                                        false :
                                        {
                                            elem: 'meta',
                                            'http-equiv': 'X-UA-Compatible',
                                            content: ctx.getParam('x-ua-compatible') || 'IE=EmulateIE7, IE=edge'
                                        },
                                    {
                                        elem: 'title',
                                        content: ctx.getParam('title')
                                    },
                                    ctx.getParam('favicon') ?
                                        {
                                            elem: 'favicon',
                                            url: ctx.getParam('favicon')
                                        } :
                                        '',
                                    {
                                        block: 'y-ua'
                                    }
                                ],
                                styleElements,
                                ctx.getParam('head')
                            ]
                        },
                        ctx.getJson()
                    ]
                }
            ];
        });

        bt.match('y-page_islet*', function (ctx) {
            ctx.setTag('body');
            ctx.enableAutoInit();
            var scriptElements;
            var scripts = ctx.getParam('scripts');
            if (scripts) {
                var global = bt.lib.global;
                scriptElements = scripts.map(function (script) {
                    return {
                        elem: 'js',
                        url: script.url ? script.url.replace('{lang}', global.lang) : undefined,
                        source: script.source
                    };
                });
            }
            ctx.setContent([ctx.getParam('body'), scriptElements]);
        });

        bt.match('y-page_islet*__title', function (ctx) {
            ctx.disableCssClassGeneration();
            ctx.setTag('title');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-page_islet*__html', function (ctx) {
            ctx.setTag('html');
            ctx.disableCssClassGeneration();
            ctx.setAttr('class', 'y-ua_js_no y-ua_css_standard');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-page_islet*__head', function (ctx) {
            ctx.setTag('head');
            ctx.disableCssClassGeneration();
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-page_islet*__meta', function (ctx) {
            ctx.setTag('meta');
            ctx.disableCssClassGeneration();
            ctx.setAttr('content', ctx.getParam('content'));
            ctx.setAttr('http-equiv', ctx.getParam('http-equiv'));
            ctx.setAttr('charset', ctx.getParam('charset'));
        });

        bt.match('y-page_islet*__favicon', function (ctx) {
            ctx.disableCssClassGeneration();
            ctx.setTag('link');
            ctx.setAttr('rel', 'shortcut icon');
            ctx.setAttr('href', ctx.getParam('url'));
        });

        bt.match('y-page_islet*__js', function (ctx) {
            ctx.disableCssClassGeneration();
            ctx.setTag('script');
            var url = ctx.getParam('url');
            if (url) {
                ctx.setAttr('src', url);
            }
            var source = ctx.getParam('source');
            if (source) {
                ctx.setContent(source);
            }
            ctx.setAttr('type', 'text/javascript');
        });

        bt.match('y-page_islet*__css', function (ctx) {
            ctx.disableCssClassGeneration();
            var url = ctx.getParam('url');

            if (url) {
                ctx.setTag('link');
                ctx.setAttr('rel', 'stylesheet');
                ctx.setAttr('href', url);
            } else {
                ctx.setTag('style');
            }

            var ie = ctx.getParam('ie');
            if (ie !== undefined) {
                if (ie === true) {
                    return ['<!--[if IE]>', ctx.getJson(), '<![endif]-->'];
                } else if (ie === false) {
                    return ['<!--[if !IE]> -->', ctx.getJson(), '<!-- <![endif]-->'];
                } else {
                    return ['<!--[if ' + ie + ']>', ctx.getJson(), '<![endif]-->'];
                }
            }
        });


    // end: ../../blocks/common/y-page/y-page.bt.js

    // begin: ../../blocks/common/y-global/y-global.bt.js


        bt.lib.global = bt.lib.global || {};
        bt.lib.global.lang = bt.lib.global.lang || 'ru';
        bt.lib.global.tld = bt.lib.global.tld || 'ru';
        bt.lib.global['content-region'] = bt.lib.global['content-region'] || 'ru';
        bt.lib.global['click-host'] = bt.lib.global['click-host'] || '//clck.yandex.ru';
        bt.lib.global['passport-host'] = bt.lib.global['passport-host'] || 'https://passport.yandex.ru';
        bt.lib.global['pass-host'] = bt.lib.global['pass-host'] || '//pass.yandex.ru';
        bt.lib.global['social-host'] = bt.lib.global['social-host'] || '//social.yandex.ru';
        bt.lib.global['export-host'] = bt.lib.global['export-host'] || '//export.yandex.ru';

        /**
         * Changes top level domain.
         *
         * @param {String} tld Top level domain.
         */
        bt.lib.global.setTld = function (tld) {
            var xYaDomain = tld === 'tr' ? 'yandex.com.tr' : 'yandex.' + tld;
            var yaDomain = ['ua', 'by', 'kz'].indexOf(tld) !== -1 ? 'yandex.ru' : xYaDomain;
            var globalObj = bt.lib.global;
            globalObj['content-region'] = tld;
            globalObj['click-host'] = '//clck.' + yaDomain;
            globalObj['passport-host'] = 'https://passport.' + yaDomain;
            globalObj['pass-host'] = '//pass.' + xYaDomain;
            globalObj['social-host'] = '//social.' + xYaDomain;
            globalObj['export-host'] = '//export.' + xYaDomain;
        };

        if (bt.lib.i18n && bt.lib.i18n.getLanguage) {
            bt.lib.global.setTld(bt.lib.i18n.getLanguage());
        }


    // end: ../../blocks/common/y-global/y-global.bt.js

    // begin: ../../blocks/common/y-ua/y-ua.bt.js


        bt.match('y-ua', function (ctx) {
            ctx.setTag('script');
            ctx.disableCssClassGeneration();
            ctx.disableDataAttrGeneration();
            ctx.setContent([
                ';(function (d,e,c,r){' +
                    'e=d.documentElement;' +
                    'c="className";' +
                    'r="replace";' +
                    'e[c]=e[c][r]("y-ua_js_no","y-ua_js_yes");' +
                    'if(d.compatMode!="CSS1Compat")' +
                    'e[c]=e[c][r]("y-ua_css_standart","y-ua_css_quirks")' +
                '})(document);' +
                ';(function (d,e,c,r,n,w,v,f){' +
                    'e=d.documentElement;' +
                    'c="className";' +
                    'r="replace";' +
                    'n="createElementNS";' +
                    'f="firstChild";' +
                    'w="http://www.w3.org/2000/svg";' +
                    'e[c]+=!!d[n]&&!!d[n](w,"svg").createSVGRect?" y-ua_svg_yes":" y-ua_svg_no";' +
                    'v=d.createElement("div");' +
                    'v.innerHTML="<svg/>";' +
                    'e[c]+=(v[f]&&v[f].namespaceURI)==w?" y-ua_inlinesvg_yes":" y-ua_inlinesvg_no";' +
                '})(document);'
            ]);
        });


    // end: ../../blocks/common/y-ua/y-ua.bt.js

    // begin: ../../blocks/common/y-header/y-header.bt.js


        /**
         * @param {Boolean} showBoard Отображать ли таблицу сервисов?
         * @param {String} userPic Аватар пользователя
         * @param {String} userLogin Никнейм пользователя
         * @param {Boolean} showUser Отображать ли аватар пользователя?
         * @param {Boolean} showSuggest Отображать ли саджест?
         * @param {String} searchAction Путь к обработчику формы поиска
         * @param {String} searchQuery Текст запроса
         * @param {String} serviceName Имя сервиса.
         *                             В непоисковой шапке отображается на фоне жёлтой стрелки.
         *                             В поисковой шапке отображается внутри поискового поля
         * @param {String} serviceUrl Путь для перехода на главную страницу сервиса
         */

        bt.setDefaultView('y-header', 'islet');

        bt.match('y-header_islet*', function (ctx) {
            ctx.setTag('header');

            ctx.setContent([
                {
                    elem: 'wrapper',
                    showBoard: ctx.getParam('showBoard'),
                    showTabs: ctx.getParam('showTabs'),
                    searchAction: ctx.getParam('searchAction'),
                    searchQuery: ctx.getParam('searchQuery'),
                    serviceName: ctx.getParam('serviceName'),
                    serviceUrl: ctx.getParam('serviceUrl'),
                    showSuggest: ctx.getParam('showSuggest'),
                    suggestOptions: ctx.getParam('suggestOptions'),
                    logoAlt: ctx.getParam('logoAlt'),
                    logoSrc: ctx.getParam('logoSrc'),
                    showUser: ctx.getParam('showUser'),
                    userPic: ctx.getParam('userPic'),
                    userLogin: ctx.getParam('userLogin')
                },
                ctx.getParam('showBoard') ? {elem: 'board'} : null
            ]);

            ctx.enableAutoInit();
        });

        bt.match('y-header_islet*__wrapper', function (ctx) {
            var showBoard = ctx.getParam('showBoard');
            var showTabs = ctx.getParam('showTabs');

            ctx.setContent([
                {
                    elem: 'logo',
                    logoAlt: ctx.getParam('logoAlt'),
                    logoSrc: ctx.getParam('logoSrc')
                },
                {
                    elem: 'info',
                    content: [
                        showBoard ? {elem: 'board-call'} : null,
                        getUser(ctx)
                    ]
                },
                {
                    elem: 'arrow',
                    searchAction: ctx.getParam('searchAction'),
                    searchQuery: ctx.getParam('searchQuery'),
                    serviceName: ctx.getParam('serviceName'),
                    serviceUrl: ctx.getParam('serviceUrl'),
                    showSuggest: ctx.getParam('showSuggest'),
                    suggestOptions: ctx.getParam('suggestOptions'),
                    icons: ctx.getParam('icons')
                },
                showTabs ? {elem: 'tabs'} : null
            ]);
        });

        bt.match('y-header_islet__arrow', function (ctx) {
            ctx.setContent({
                elem: 'service-name',
                serviceUrl: ctx.getParam('serviceUrl'),
                content: ctx.getParam('serviceName')
            });
        });

        bt.match('y-header_islet-search__arrow', function (ctx) {
            ctx.setContent({
                elem: 'form',
                searchAction: ctx.getParam('searchAction'),
                searchQuery: ctx.getParam('searchQuery'),
                serviceName: ctx.getParam('serviceName'),
                serviceUrl: ctx.getParam('serviceUrl'),
                suggestOptions: ctx.getParam('suggestOptions'),
                showSuggest: ctx.getParam('showSuggest'),
                icons: ctx.getParam('icons')
            });
        });

        bt.match('y-header_islet*__logo', function (ctx) {
            ctx.setTag('a');
            ctx.setState('lang', bt.lib.i18n.getLanguage());

            ctx.setAttr('href', bt.lib.services.getServiceUrl('www'));
            ctx.setContent({
                elem: 'logo-img',
                logoAlt: ctx.getParam('logoAlt'),
                logoSrc: ctx.getParam('logoSrc')
            });
        });

        bt.match('y-header_islet*__logo-img', function (ctx) {
            ctx.setTag('img');
            ctx.setAttr('alt', ctx.getParam('logoAlt') || bt.lib.i18n('logo', 'yandex'));
            ctx.setAttr('src', ctx.getParam('logoSrc') || bt.lib.i18n('logo', 'src'));
        });

        bt.match('y-header_islet*__service-name', function (ctx) {
            if (ctx.getParam('serviceUrl')) {
                ctx.setTag('a');
                ctx.setAttr('href', ctx.getParam('serviceUrl'));
            } else {
                ctx.setTag('h1');
            }

            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-header_islet*__user', function (ctx) {
            var userPic = ctx.getParam('userPic');
            var userLogin = ctx.getParam('userLogin');

            ctx.setTag('a');
            ctx.setAttr('href', 'http://i.yandex.ru');

            ctx.setContent([
                userPic ? {
                    elem: 'userpic',
                    userPic: userPic
                } : null,
                userLogin ? {
                    elem: 'username',
                    userLogin: userLogin
                } : null
            ]);
        });

        bt.match('y-header_islet*__userpic', function (ctx) {
            var userPic = ctx.getParam('userPic');

            ctx.setTag('img');
            ctx.setAttr('src', userPic);
        });

        bt.match('y-header_islet*__username', function (ctx) {
            var userLogin = ctx.getParam('userLogin');

            ctx.setTag('span');
            ctx.setContent(userLogin);
        });

        bt.match('y-header_islet*__board-call', function (ctx) {
            ctx.setTag('span');
            ctx.setContent({
                block: 'y-button',
                view: 'islet-board',
                url: bt.lib.services.getServiceUrl('all'),
                icon: {
                    block: 'y-header',
                    view: 'islet',
                    elem: 'board-call-icon'
                }
            });
        });

        bt.match('y-header_islet*__board-icon', function (ctx) {
            ctx.setTag('span');
        });

        bt.match('y-header_islet-search__form', function (ctx) {
            var searchQuery = ctx.getParam('searchQuery');
            var searchAction = ctx.getParam('searchAction');
            var serviceName = ctx.getParam('serviceName');
            var serviceUrl = ctx.getParam('serviceUrl');
            var showSuggest = ctx.getParam('showSuggest');
            var suggestOptions = ctx.getParam('suggestOptions');
            var icons = ctx.getParam('icons');

            var yInputView;
            if (serviceName || icons) {
                if (serviceName) {
                    yInputView = 'islet-label-icons';
                } else if (icons) {
                    yInputView = 'islet-icons';
                }
            }

            ctx.setTag('form');
            ctx.setAttr('action', searchAction);

            var input = {
                block: 'y-input',
                view: yInputView,
                name: 'text',

                value: searchQuery,
                labelUrl: serviceUrl,
                labelText: serviceName,
                showClear: true
            };

            if (showSuggest) {
                var suggest = suggestOptions || {};
                suggest.block = 'y-suggest';
                suggest.input = input;
                suggest.suggestDropOptions = suggest.suggestDropOptions || {
                    view: 'islet-header'
                };
                suggest.suggestDropOptions.suggestDropItemView =
                    suggest.suggestDropOptions.suggestDropItemView || 'islet-header';
                input = suggest;
            }

            ctx.setContent([
                {
                    elem: 'button',
                    content: {
                        block: 'y-button',
                        type: 'submit',
                        tabindex: 2,
                        text: 'Найти'
                    }
                },
                {
                    elem: 'input',
                    content: input
                }
            ]);
        });

        bt.match(
            [
                'y-header_islet*__info',
                'y-header_islet-search__button',
                'y-header_islet-search__input'
            ],
            function (ctx) {
                ctx.setContent(ctx.getParam('content'));
            }
        );

        function getUser (ctx) {
            var showUser = ctx.getParam('showUser');
            var userPic = ctx.getParam('userPic');
            var userLogin = ctx.getParam('userLogin');

            if (!showUser) {
                return null;
            } else if (!userLogin && !userPic){
                return {
                    elem: 'login-btn'
                };
            } else {
                return {
                    elem: 'user',
                    userPic: userPic,
                    userLogin: userLogin
                };
            }
        }


    // end: ../../blocks/common/y-header/y-header.bt.js

    // begin: ../../blocks/common/y-button/y-button.bt.js


        /**
         * @param {String} url Если указан, то кнопка становится ссылкой, а значение `url` становится атрибутом `href`
         * @param {String} type Тип кнопки. `button` — просто кнопка, `submit` — отправка формы, `reset` — сброс формы
         * @param {Boolean} showTick Показать справа от текста стрелку,
         *                           направленную вниз (может быть использовано для селектов)
         * @param {Number} tabindex Задает `html`-атрибут `tabindex`
         * @param {String} target Задает `html`-атрибут `target`. Применимо в случае, когда указана опция `url`
         * @param {Boolean} disabled Переводит кнопку в неактивное состояние.
         *                           Устанавливает атрибут `disabled` в значение `disabled`
         * @param {Btjson} icon Блок или элемент любого блока, формирующий иконку
         */

        bt.setDefaultView('y-button', 'islet');

        bt.match('y-button_islet*', function (ctx) {
            var disabled = ctx.getParam('disabled');
            if (disabled) {
                ctx.setState('disabled');
            }

            var url = ctx.getParam('url');
            if (url) {
                ctx.setTag('a');
            } else {
                ctx.setTag('button');
            }

            ctx.enableAutoInit();

            var tabIndex = ctx.getParam('tabindex');
            if (tabIndex) {
                ctx.setAttr('tabindex', tabIndex);
            }

            if (!url) {
                if (disabled) {
                    ctx.setAttr('disabled', true);
                }
                ctx.setAttr('type', ctx.getParam('type') || 'button');
            }

            if (url) {
                ctx.setAttr('role', 'button');
                if (disabled) {
                    ctx.setAttr('aria-disabled', true);
                }
                var target = ctx.getParam('target');
                if (target) {
                    ctx.setAttr('target', target);
                }
                ctx.setAttr('href', url);
            }

            var icon = ctx.getParam('icon');
            var text = ctx.getParam('text');
            var tick = ctx.getParam('showTick');

            ctx.setContent([
                icon ? {elem: 'icon', name: icon} : null,
                text ? {elem: 'text', content: text} : null,
                tick ? {elem: 'tick'} : null
            ]);
        });

        bt.match('y-button_islet*__icon', function (ctx) {
            ctx.setTag('span');
            ctx.setContent(ctx.getParam('name'));
        });

        bt.match('y-button_islet*__text', function (ctx) {
            ctx.setTag('span');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-button_islet*__tick', function (ctx) {
            ctx.setTag('span');
        });

    // end: ../../blocks/common/y-button/y-button.bt.js

    // begin: ../../blocks/common/y-input/y-input.bt.js


        /**
         * @param {String} id Идентификатор DOM-элемента
         * @param {String} name Имя элемента формы
         * @param {String} value Значение поля
         * @param {String} type Тип кнопки. Например, `password`
         * @param {Number} tabindex Задает `html`-атрибут `tabindex`
         * @param {String} autocomplete Задает `html`-атрибут `autocomplete`. Включает автозаполнение текста
         * @param {Number} maxlength Задает `html`-атрибут `maxlength`. Устанавливает максимальное число символов,
         *                           которое может быть введено
         * @param {String} placeholder Задает `html`-атрибут `placeholder`.
         *                             Выводит текст внутри поля, который исчезает при заполнении поля
         * @param {String} hint Подсказка серого цвета. Например, `найдено 42 млн ответов`. Не путать с `placeholder`
         * @param {String} labelText Любой текст-метка слева от поля. Например, название сервиса `Карты`
         * @param {String} labelUrl Адрес для перехода с текста-метки
         * @param {Boolean} showClear Отображать крестик для очистки поля ввода.
         * @param {Boolean} disabled Переводит кнопку в неактивное состояние.
         *                           Устанавливает атрибут `disabled` в значение `disabled`
         */

        bt.setDefaultView('y-input', 'islet');

        bt.match('y-input_islet*', function (ctx) {

            ctx.setTag('span');
            ctx.enableAutoInit();

            if (ctx.getParam('disabled')) {
                ctx.setState('disabled');
            }

            var icons;
            if (ctx.getParam('showClear')) {
                icons = ['close-small'];
            }

            ctx.setContent([
                // в ие8 эта плашка с кол-вом результатов не покажется. ее перекроет инпут с белым бекграундом.
                // если у инпута будет бекграунд transparent плашка заберет клик у инпута
                ctx.getParam('hint') && {
                    elem: 'responses',
                    tag: 'span',
                    attrs: {style: 'margin-left: 150px'}, /* по кеyup/keypress обновлять значение left */
                    content: ctx.getParam('hint')
                },
                // если нет параметра labelText не рисуем html tag
                ctx.getParam('labelText') && {
                    elem: 'label',
                    content: {
                        /* оставляю вложенный элемент для задания счетчика в будущем
                         и возможности передать сюда все что угодно
                         */
                        elem: 'label-link',
                        labelUrl: ctx.getParam('labelUrl'),
                        content: ctx.getParam('labelText')
                    }
                },
                icons && {
                    elem: 'icons',
                    names: icons
                },
                {
                    elem: 'context',
                    content: {
                        elem: 'control',
                        type: ctx.getParam('type'),
                        id: ctx.getParam('id'),
                        name: ctx.getParam('name'),
                        value: ctx.getParam('value'),
                        tabindex: ctx.getParam('tabindex'),
                        disabled: ctx.getParam('disabled'),
                        autocomplete: ctx.getParam('autocomplete'),
                        maxlength: ctx.getParam('maxlength'),
                        placeholder: ctx.getParam('placeholder')
                    }
                }
            ]);
        });

        bt.match('y-input_islet*__label', function (ctx) {
            ctx.setTag('span');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-input_islet*__label-link', function (ctx) {
            ctx.setTag('a');
            ctx.setAttr('href', ctx.getParam('labelUrl'));
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-input_islet*__responses', function (ctx) {
            ctx.setTag('span');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-input_islet*__icons', function (ctx) {
            ctx.setTag('span');

            var names = ctx.getParam('names');
            var iconNames = Array.isArray(names) ? names : [names];

            ctx.setContent(
                iconNames.map(function (name) {
                    return {
                        elem: name // например, close-small или shield-big
                    };
                })
            );
        });

        bt.match('y-input_islet*__context', function (ctx) {
            ctx.setTag('span');
            ctx.setContent(ctx.getParam('content'));
        });

        bt.match('y-input_islet*__close-small', function (ctx) {
            ctx.setTag('span');
        });

        bt.match('y-input_islet*__control', function (ctx) {
            ctx.setTag('input');
            ctx.setAttr('id', ctx.getParam('id') || ctx.generateId());
            ctx.setAttr('type', ctx.getParam('type'));
            ctx.setAttr('name', ctx.getParam('name'));
            ctx.setAttr('value', ctx.getParam('value'));
            ctx.setAttr('tabindex', ctx.getParam('tabindex'));
            ctx.setAttr('disabled', ctx.getParam('disabled'));
            ctx.setAttr('autocomplete', ctx.getParam('autocomplete'));
            ctx.setAttr('maxlength', ctx.getParam('maxlength'));
            ctx.setAttr('placeholder', ctx.getParam('placeholder'));
        });


    // end: ../../blocks/common/y-input/y-input.bt.js

    // begin: ../../blocks/common/y-services/y-services.bt.js

        var services = {
            'all-services': function (reg) {
                if (reg === 'ru') return "http://yandex.ru/all";
                if (reg === 'tr') return "http://www.yandex.com.tr/all";
                return "http://yandex.ru/all";
            },
            'mail': function (reg) {
                if (reg === 'ru') return "http://mail.yandex.ru";
                if (reg === 'ua') return "http://mail.yandex.ua";
                if (reg === 'by') return "http://mail.yandex.by";
                if (reg === 'kz') return "http://mail.yandex.kz";
                if (reg === 'com') return "http://mail.yandex.com";
                if (reg === 'tr') return "http://mail.yandex.com.tr";
                return "http://mail.yandex.ru";
            },
            'pdd': function (reg) {
                if (reg === 'ru') return "http://pdd.yandex.ru";
                return "http://pdd.yandex.ru";
            },
            'zakladki': function (reg) {
                if (reg === 'ru') return "http://zakladki.yandex.ru";
                return "http://zakladki.yandex.ru";
            },
            'fotki': function (reg) {
                if (reg === 'ru') return "http://fotki.yandex.ru";
                return "http://fotki.yandex.ru";
            },
            'moikrug': function (reg) {
                if (reg === 'ru') return "http://moikrug.ru";
                return "http://moikrug.ru";
            },
            'direct': function (reg) {
                if (reg === 'ru') return "http://direct.yandex.ru";
                if (reg === 'ua') return "http://direct.yandex.ua";
                if (reg === 'by') return "http://direct.yandex.by";
                if (reg === 'kz') return "http://direct.yandex.kz";
                if (reg === 'com') return "http://direct.yandex.com";
                return "http://direct.yandex.ru";
            },
            'money': function (reg) {
                if (reg === 'ru') return "https://money.yandex.ru";
                return "https://money.yandex.ru";
            },
            'lenta': function (reg) {
                if (reg === 'ru') return "http://lenta.yandex.ru";
                return "http://lenta.yandex.ru";
            },
            'market': function (reg) {
                if (reg === 'ru') return "http://market.yandex.ru";
                if (reg === 'ua') return "http://market.yandex.ua";
                if (reg === 'by') return "http://market.yandex.by";
                if (reg === 'kz') return "http://market.yandex.kz";
                return "http://market.yandex.ru";
            },
            'market.advertising': function (reg) {
                if (reg === 'ru') return "http://welcome.advertising.yandex.ru/market/";
                return "http://welcome.advertising.yandex.ru/market/";
            },
            'wow': function (reg) {
                if (reg === 'ru') return "http://my.ya.ru";
                return "http://my.ya.ru";
            },
            'tv': function (reg) {
                if (reg === 'ru') return "http://tv.yandex.ru";
                if (reg === 'ua') return "http://tv.yandex.ua";
                if (reg === 'by') return "http://tv.yandex.by";
                if (reg === 'kz') return "http://tv.yandex.kz";
                return "http://tv.yandex.ru";
            },
            'afisha': function (reg) {
                if (reg === 'ru') return "http://afisha.yandex.ru";
                if (reg === 'ua') return "http://afisha.yandex.ua";
                if (reg === 'by') return "http://afisha.yandex.by";
                if (reg === 'kz') return "http://afisha.yandex.kz";
                if (reg === 'tr') return "http://afis.yandex.com.tr";
                return "http://afisha.yandex.ru";
            },
            'calendar': function (reg) {
                if (reg === 'ru') return "http://calendar.yandex.ru";
                return "http://calendar.yandex.ru";
            },
            'nahodki': function (reg) {
                if (reg === 'ru') return "http://nahodki.yandex.ru";
                if (reg === 'ua') return "http://nahodki.yandex.ua";
                if (reg === 'kz') return "http://nahodki.yandex.kz";
                return "http://nahodki.yandex.ru";
            },
            'weather': function (reg) {
                if (reg === 'ru') return "http://pogoda.yandex.ru";
                if (reg === 'ua') return "http://pogoda.yandex.ua";
                if (reg === 'by') return "http://pogoda.yandex.by";
                if (reg === 'kz') return "http://pogoda.yandex.kz";
                if (reg === 'tr') return "http://hava.yandex.com.tr";
                return "http://pogoda.yandex.ru";
            },
            'kuda': function (reg) {
                if (reg === 'ru') return "http://kuda.yandex.ru";
                return "http://kuda.yandex.ru";
            },
            'video': function (reg) {
                if (reg === 'ru') return "http://video.yandex.ru";
                if (reg === 'ua') return "http://video.yandex.ua";
                if (reg === 'by') return "http://video.yandex.by";
                if (reg === 'kz') return "http://video.yandex.kz";
                if (reg === 'com') return "http://video.yandex.com";
                if (reg === 'tr') return "http://video.yandex.com.tr";
                return "http://video.yandex.ru";
            },
            'video-com': function (reg) {
                if (reg === 'ru') return "http://video.yandex.com";
                return "http://video.yandex.com";
            },
            'music': function (reg) {
                if (reg === 'ru') return "http://music.yandex.ru";
                if (reg === 'ua') return "http://music.yandex.ua";
                if (reg === 'by') return "http://music.yandex.by";
                if (reg === 'kz') return "http://music.yandex.kz";
                return "http://music.yandex.ru";
            },
            'music-partner': function (reg) {
                if (reg === 'ru') return "http://music-partner.yandex.ru";
                return "http://music-partner.yandex.ru";
            },
            'www': function (reg) {
                if (reg === 'ru') return "http://www.yandex.ru";
                if (reg === 'ua') return "http://www.yandex.ua";
                if (reg === 'com') return "http://www.yandex.com";
                if (reg === 'by') return "http://www.yandex.by";
                if (reg === 'kz') return "http://www.yandex.kz";
                if (reg === 'tr') return "http://www.yandex.com.tr";
                return "http://www.yandex.ru";
            },
            'search': function (reg) {
                if (reg === 'ru') return "http://yandex.ru";
                if (reg === 'ua') return "http://yandex.ua";
                if (reg === 'com') return "http://yandex.com";
                if (reg === 'by') return "http://yandex.by";
                if (reg === 'kz') return "http://yandex.kz";
                if (reg === 'tr') return "http://yandex.com.tr";
                return "http://yandex.ru";
            },
            'news': function (reg) {
                if (reg === 'ru') return "http://news.yandex.ru";
                if (reg === 'ua') return "http://news.yandex.ua";
                if (reg === 'by') return "http://news.yandex.by";
                if (reg === 'kz') return "http://news.yandex.kz";
                if (reg === 'tr') return "http://haber.yandex.com.tr";
                return "http://news.yandex.ru";
            },
            'news-com': function (reg) {
                if (reg === 'ru') return "http://news.yandex.com";
                return "http://news.yandex.com";
            },
            'maps': function (reg) {
                if (reg === 'ru') return "http://maps.yandex.ru";
                if (reg === 'ua') return "http://maps.yandex.ua";
                if (reg === 'tr') return "http://harita.yandex.com.tr";
                return "http://maps.yandex.ru";
            },
            'maps-com': function (reg) {
                if (reg === 'ru') return "http://maps.yandex.com";
                return "http://maps.yandex.com";
            },
            'probki': function (reg) {
                if (reg === 'ru') return "http://probki.yandex.ru";
                return "http://probki.yandex.ru";
            },
            'slovari': function (reg) {
                if (reg === 'ru') return "http://slovari.yandex.ru";
                if (reg === 'ua') return "http://slovari.yandex.ua";
                if (reg === 'by') return "http://slovari.yandex.by";
                if (reg === 'kz') return "http://slovari.yandex.kz";
                return "http://slovari.yandex.ru";
            },
            'images': function (reg) {
                if (reg === 'ru') return "http://images.yandex.ru";
                if (reg === 'ua') return "http://images.yandex.ua";
                if (reg === 'by') return "http://images.yandex.by";
                if (reg === 'kz') return "http://images.yandex.kz";
                if (reg === 'com') return "http://images.yandex.com";
                if (reg === 'tr') return "http://gorsel.yandex.com.tr";
                return "http://images.yandex.ru";
            },
            'images-com': function (reg) {
                if (reg === 'ru') return "http://images.yandex.com";
                return "http://images.yandex.com";
            },
            'blogs': function (reg) {
                if (reg === 'ru') return "http://blogs.yandex.ru";
                if (reg === 'ua') return "http://blogs.yandex.ua";
                if (reg === 'by') return "http://blogs.yandex.by";
                if (reg === 'kz') return "http://blogs.yandex.kz";
                return "http://blogs.yandex.ru";
            },
            'auto': function (reg) {
                if (reg === 'ru') return "http://auto.yandex.ru";
                return "http://auto.yandex.ru";
            },
            'adresa': function (reg) {
                if (reg === 'ru') return "http://adresa.yandex.ru";
                return "http://adresa.yandex.ru";
            },
            'games': function (reg) {
                if (reg === 'ru') return "http://games.yandex.ru";
                return "http://games.yandex.ru";
            },
            'yaca': function (reg) {
                if (reg === 'ru') return "http://yaca.yandex.ru";
                if (reg === 'ua') return "http://yaca.yandex.ua";
                if (reg === 'by') return "http://yaca.yandex.by";
                return "http://yaca.yandex.ru";
            },
            'rasp': function (reg) {
                if (reg === 'ru') return "http://rasp.yandex.ru";
                if (reg === 'ua') return "http://rasp.yandex.ua";
                if (reg === 'by') return "http://rasp.yandex.by";
                if (reg === 'kz') return "http://rasp.yandex.kz";
                return "http://rasp.yandex.ru";
            },
            'pvo': function (reg) {
                if (reg === 'ru') return "http://ask.yandex.ru";
                return "http://ask.yandex.ru";
            },
            'online': function (reg) {
                if (reg === 'ru') return "http://online.yandex.ru";
                return "http://online.yandex.ru";
            },
            'books': function (reg) {
                if (reg === 'ru') return "http://books.yandex.ru";
                return "http://books.yandex.ru";
            },
            'site': function (reg) {
                if (reg === 'ru') return "http://site.yandex.ru";
                if (reg === 'ua') return "http://site.yandex.ua";
                if (reg === 'tr') return "http://ozel.yandex.com.tr";
                return "http://site.yandex.ru";
            },
            'bar': function (reg) {
                if (reg === 'ru') return "http://bar.yandex.ru";
                if (reg === 'ua') return "http://bar.yandex.ua";
                if (reg === 'by') return "http://bar.yandex.by";
                if (reg === 'kz') return "http://bar.yandex.kz";
                if (reg === 'tr') return "http://bar.yandex.com.tr";
                return "http://bar.yandex.ru";
            },
            'widgets': function (reg) {
                if (reg === 'ru') return "http://widgets.yandex.ru";
                if (reg === 'ua') return "http://widgets.yandex.ua";
                if (reg === 'by') return "http://widgets.yandex.by";
                if (reg === 'kz') return "http://widgets.yandex.kz";
                if (reg === 'tr') return "http://widgets.yandex.com.tr";
                return "http://widgets.yandex.ru";
            },
            'wdgt': function (reg) {
                if (reg === 'ru') return "http://wdgt.yandex.ru";
                if (reg === 'ua') return "http://wdgt.yandex.ua";
                if (reg === 'by') return "http://wdgt.yandex.by";
                if (reg === 'kz') return "http://wdgt.yandex.kz";
                if (reg === 'tr') return "http://wdgt.yandex.com.tr";
                return "http://wdgt.yandex.ru";
            },
            'interests': function (reg) {
                if (reg === 'ru') return "http://interests.yandex.ru";
                return "http://interests.yandex.ru";
            },
            'kraski': function (reg) {
                if (reg === 'ru') return "http://kraski.yandex.ru";
                return "http://kraski.yandex.ru";
            },
            'local': function (reg) {
                if (reg === 'ru') return "http://local.yandex.ru";
                return "http://local.yandex.ru";
            },
            'museums': function (reg) {
                if (reg === 'ru') return "http://18.yandex.ru";
                return "http://18.yandex.ru";
            },
            'collection': function (reg) {
                if (reg === 'ru') return "http://collection.yandex.ru";
                return "http://collection.yandex.ru";
            },
            'company': function (reg) {
                if (reg === 'ru') return "http://company.yandex.ru";
                if (reg === 'com') return "http://company.yandex.com";
                if (reg === 'tr') return "http://company.yandex.com.tr";
                return "http://company.yandex.ru";
            },
            'tests': function (reg) {
                if (reg === 'ru') return "http://tests.yandex.ru";
                return "http://tests.yandex.ru";
            },
            'referats': function (reg) {
                if (reg === 'ru') return "http://referats.yandex.ru";
                return "http://referats.yandex.ru";
            },
            'terms': function (reg) {
                if (reg === 'ru') return "http://terms.yandex.ru";
                return "http://terms.yandex.ru";
            },
            'tune': function (reg) {
                if (reg === 'ru') return "http://tune.yandex.ru";
                if (reg === 'ua') return "http://tune.yandex.ua";
                if (reg === 'com') return "http://tune.yandex.com";
                if (reg === 'by') return "http://tune.yandex.by";
                if (reg === 'kz') return "http://tune.yandex.kz";
                if (reg === 'tr') return "http://tune.yandex.com.tr";
                return "http://tune.yandex.ru";
            },
            'api': function (reg) {
                if (reg === 'ru') return "http://api.yandex.ru";
                if (reg === 'com') return "http://api.yandex.com";
                return "http://api.yandex.ru";
            },
            'punto': function (reg) {
                if (reg === 'ru') return "http://punto.yandex.ru";
                return "http://punto.yandex.ru";
            },
            'opinion': function (reg) {
                if (reg === 'ru') return "http://opinion.yandex.ru";
                return "http://opinion.yandex.ru";
            },
            'perevod': function (reg) {
                if (reg === 'ru') return "http://perevod.yandex.ru";
                return "http://perevod.yandex.ru";
            },
            'rabota': function (reg) {
                if (reg === 'ru') return "http://rabota.yandex.ru";
                if (reg === 'ua') return "http://rabota.yandex.ua";
                if (reg === 'by') return "http://rabota.yandex.by";
                if (reg === 'kz') return "http://rabota.yandex.kz";
                return "http://rabota.yandex.ru";
            },
            'sprav': function (reg) {
                if (reg === 'ru') return "http://sprav.yandex.ru";
                if (reg === 'ua') return "http://sprav.yandex.ua";
                if (reg === 'by') return "http://sprav.yandex.by";
                if (reg === 'kz') return "http://sprav.yandex.kz";
                if (reg === 'tr') return "http://rehber.yandex.com.tr";
                return "http://sprav.yandex.ru";
            },
            'realty': function (reg) {
                if (reg === 'ru') return "http://realty.yandex.ru";
                if (reg === 'ua') return "http://realty.yandex.ua";
                if (reg === 'by') return "http://realty.yandex.by";
                if (reg === 'kz') return "http://realty.yandex.kz";
                return "http://realty.yandex.ru";
            },
            'advertising': function (reg) {
                if (reg === 'ru') return "http://advertising.yandex.ru";
                if (reg === 'ua') return "http://advertising.yandex.ua";
                if (reg === 'com') return "http://advertising.yandex.com";
                if (reg === 'by') return "http://advertising.yandex.by";
                if (reg === 'kz') return "http://advertising.yandex.kz";
                return "http://advertising.yandex.ru";
            },
            'expert': function (reg) {
                if (reg === 'ru') return "http://expert.yandex.ru";
                return "http://expert.yandex.ru";
            },
            'direct.market': function (reg) {
                if (reg === 'ru') return "http://partner.market.yandex.ru/yandex.market/";
                return "http://partner.market.yandex.ru/yandex.market/";
            },
            'ba': function (reg) {
                if (reg === 'ru') return "http://ba.yandex.ru";
                if (reg === 'ua') return "http://ba.yandex.ua";
                if (reg === 'com') return "http://ba.yandex.com";
                if (reg === 'by') return "http://ba.yandex.by";
                if (reg === 'kz') return "http://ba.yandex.kz";
                return "http://ba.yandex.ru";
            },
            'bayan': function (reg) {
                if (reg === 'ru') return "http://bayan.yandex.ru";
                return "http://bayan.yandex.ru";
            },
            'partners': function (reg) {
                if (reg === 'ru') return "http://partner.yandex.ru";
                if (reg === 'ua') return "http://partner.yandex.ua";
                if (reg === 'com') return "http://partner.yandex.com";
                if (reg === 'by') return "http://partner.yandex.by";
                if (reg === 'kz') return "http://partner.yandex.kz";
                return "http://partner.yandex.ru";
            },
            'metrika': function (reg) {
                if (reg === 'ru') return "http://metrika.yandex.ru";
                if (reg === 'ua') return "http://metrika.yandex.ua";
                if (reg === 'com') return "http://metrica.yandex.com";
                if (reg === 'by') return "http://metrika.yandex.by";
                if (reg === 'kz') return "http://metrika.yandex.kz";
                if (reg === 'tr') return "http://metrica.yandex.com.tr";
                return "http://metrika.yandex.ru";
            },
            'balance': function (reg) {
                if (reg === 'ru') return "http://balance.yandex.ru";
                return "http://balance.yandex.ru";
            },
            'wordstat': function (reg) {
                if (reg === 'ru') return "http://wordstat.yandex.ru";
                return "http://wordstat.yandex.ru";
            },
            'webmaster': function (reg) {
                if (reg === 'ru') return "http://webmaster.yandex.ru";
                if (reg === 'ua') return "http://webmaster.yandex.ua";
                if (reg === 'com') return "http://webmaster.yandex.com";
                if (reg === 'tr') return "http://webmaster.yandex.com.tr";
                return "http://webmaster.yandex.ru";
            },
            'server': function (reg) {
                if (reg === 'ru') return "http://company.yandex.ru/technology/server/";
                return "http://company.yandex.ru/technology/server/";
            },
            'stat': function (reg) {
                if (reg === 'ru') return "http://stat.yandex.ru";
                if (reg === 'ua') return "http://stat.yandex.ua";
                if (reg === 'by') return "http://stat.yandex.by";
                return "http://stat.yandex.ru";
            },
            'mobile': function (reg) {
                if (reg === 'ru') return "http://mobile.yandex.ru";
                if (reg === 'ua') return "http://mobile.yandex.ua";
                if (reg === 'tr') return "http://mobil.yandex.com.tr";
                return "http://mobile.yandex.ru";
            },
            'help': function (reg) {
                if (reg === 'ru') return "http://help.yandex.ru";
                if (reg === 'ua') return "http://help.yandex.ua";
                if (reg === 'com') return "http://help.yandex.com";
                if (reg === 'tr') return "http://yardim.yandex.com.tr";
                return "http://help.yandex.ru";
            },
            'feedback': function (reg) {
                if (reg === 'ru') return "http://feedback.yandex.ru";
                if (reg === 'ua') return "http://feedback.yandex.ua";
                if (reg === 'com') return "http://feedback.yandex.com";
                if (reg === 'by') return "http://feedback.yandex.by";
                if (reg === 'kz') return "http://feedback.yandex.kz";
                if (reg === 'tr') return "http://contact.yandex.com.tr";
                return "http://feedback.yandex.ru";
            },
            'start': function (reg) {
                if (reg === 'ru') return "http://help.yandex.ru/start/";
                if (reg === 'ua') return "http://help.yandex.ua/start/";
                if (reg === 'com') return "http://help.yandex.com/start/";
                if (reg === 'tr') return "http://yardim.yandex.com.tr/start";
                return "http://help.yandex.ru/start/";
            },
            'cityday': function (reg) {
                if (reg === 'ru') return "http://cityday.yandex.ru";
                return "http://cityday.yandex.ru";
            },
            'openid': function (reg) {
                if (reg === 'ru') return "http://openid.yandex.ru";
                return "http://openid.yandex.ru";
            },
            'oauth': function (reg) {
                if (reg === 'ru') return "http://oauth.yandex.ru";
                if (reg === 'com') return "http://oauth.yandex.com";
                return "http://oauth.yandex.ru";
            },
            'nano': function (reg) {
                if (reg === 'ru') return "http://nano.yandex.ru";
                return "http://nano.yandex.ru";
            },
            'partnersearch': function (reg) {
                if (reg === 'ru') return "http://yandex.ru";
                return "http://yandex.ru";
            },
            'city': function (reg) {
                if (reg === 'ru') return "http://city.yandex.ru";
                return "http://city.yandex.ru";
            },
            'goroda': function (reg) {
                if (reg === 'ru') return "http://goroda.yandex.ru";
                return "http://goroda.yandex.ru";
            },
            'toster': function (reg) {
                if (reg === 'ru') return "http://toster.yandex.ru";
                return "http://toster.yandex.ru";
            },
            'love': function (reg) {
                if (reg === 'ru') return "http://love.yandex.ru";
                return "http://love.yandex.ru";
            },
            'rk': function (reg) {
                if (reg === 'ru') return "http://rk.yandex.ru";
                return "http://rk.yandex.ru";
            },
            'lost': function (reg) {
                if (reg === 'ru') return "http://lost.yandex.ru";
                return "http://lost.yandex.ru";
            },
            'soft': function (reg) {
                if (reg === 'ru') return "http://soft.yandex.ru";
                if (reg === 'tr') return "http://soft.yandex.com.tr";
                return "http://soft.yandex.ru";
            },
            'passport': function (reg) {
                if (reg === 'ru') return "https://passport.yandex.ru";
                if (reg === 'com') return "http://passport.yandex.com";
                if (reg === 'tr') return "http://passport.yandex.com.tr";
                return "https://passport.yandex.ru";
            },
            'wiki': function (reg) {
                if (reg === 'ru') return "http://wiki.yandex-team.ru";
                return "http://wiki.yandex-team.ru";
            },
            'staff': function (reg) {
                if (reg === 'ru') return "http://staff.yandex.ru";
                return "http://staff.yandex.ru";
            },
            'jira': function (reg) {
                if (reg === 'ru') return "https://jira.yandex-team.ru";
                return "https://jira.yandex-team.ru";
            },
            'maillists': function (reg) {
                if (reg === 'ru') return "http://ml.yandex-team.ru";
                return "http://ml.yandex-team.ru";
            },
            'statface': function (reg) {
                if (reg === 'ru') return "https://stat.yandex-team.ru";
                return "https://stat.yandex-team.ru";
            },
            'doc': function (reg) {
                if (reg === 'ru') return "http://doc.yandex-team.ru";
                return "http://doc.yandex-team.ru";
            },
            'job': function (reg) {
                if (reg === 'ru') return "https://job.yandex-team.ru";
                return "https://job.yandex-team.ru";
            },
            'otrs': function (reg) {
                if (reg === 'ru') return "http://otrs.yandex-team.ru";
                return "http://otrs.yandex-team.ru";
            },
            'lego': function (reg) {
                if (reg === 'ru') return "http://lego.yandex-team.ru";
                return "http://lego.yandex-team.ru";
            },
            'planner': function (reg) {
                if (reg === 'ru') return "http://calendar.yandex-team.ru/invite/";
                return "http://calendar.yandex-team.ru/invite/";
            },
            'jabber': function (reg) {
                if (reg === 'ru') return "https://jabber.yandex-team.ru";
                return "https://jabber.yandex-team.ru";
            },
            'bond': function (reg) {
                if (reg === 'ru') return "http://brak.yandex-team.ru";
                return "http://brak.yandex-team.ru";
            },
            'diary': function (reg) {
                if (reg === 'ru') return "http://my.at.yandex-team.ru";
                return "http://my.at.yandex-team.ru";
            },
            'jing': function (reg) {
                if (reg === 'ru') return "http://jing.yandex-team.ru";
                return "http://jing.yandex-team.ru";
            },
            'lunapark': function (reg) {
                if (reg === 'ru') return "http://lunapark.yandex-team.ru";
                return "http://lunapark.yandex-team.ru";
            },
            'intranet-passport': function (reg) {
                if (reg === 'ru') return "https://passport.yandex-team.ru";
                return "https://passport.yandex-team.ru";
            },
            'blogmon': function (reg) {
                if (reg === 'ru') return "http://blogmon.yandex-team.ru";
                return "http://blogmon.yandex-team.ru";
            },
            'videoteka': function (reg) {
                if (reg === 'ru') return "http://videoteka.yandex.ru";
                return "http://videoteka.yandex.ru";
            },
            'gap': function (reg) {
                if (reg === 'ru') return "http://gap.yandex-team.ru";
                return "http://gap.yandex-team.ru";
            },
            'libra': function (reg) {
                if (reg === 'ru') return "http://lib.yandex-team.ru";
                return "http://lib.yandex-team.ru";
            },
            'admins': function (reg) {
                if (reg === 'ru') return "https://golem.yandex-team.ru";
                return "https://golem.yandex-team.ru";
            },
            'jams-arm': function (reg) {
                if (reg === 'ru') return "http://jams-arm.yandex-team.ru";
                return "http://jams-arm.yandex-team.ru";
            },
            'center': function (reg) {
                if (reg === 'ru') return "https://center.yandex-team.ru";
                return "https://center.yandex-team.ru";
            },
            'projects': function (reg) {
                if (reg === 'ru') return "http://p.yandex-team.ru";
                return "http://p.yandex-team.ru";
            },
            'maps-wiki': function (reg) {
                if (reg === 'ru') return "http://nk.yandex.ru";
                return "http://nk.yandex.ru";
            },
            '404': function (reg) {
                if (reg === 'ru') return "http://404.yandex.ru";
                if (reg === 'ua') return "http://404.yandex.ua";
                if (reg === 'com') return "http://404.yandex.com";
                if (reg === 'by') return "http://404.yandex.by";
                if (reg === 'kz') return "http://404.yandex.kz";
                if (reg === 'tr') return "http://404.yandex.com.tr";
                return "http://404.yandex.ru";
            },
            'i': function (reg) {
                if (reg === 'ru') return "http://i.yandex.ru";
                return "http://i.yandex.ru";
            },
            'desktop': function (reg) {
                if (reg === 'ru') return "http://desktop.yandex.ru";
                return "http://desktop.yandex.ru";
            },
            'ff': function (reg) {
                if (reg === 'ru') return "http://ff.yandex.ru";
                return "http://ff.yandex.ru";
            },
            'fx': function (reg) {
                if (reg === 'ru') return "http://fx.yandex.ru";
                if (reg === 'ua') return "http://fx.yandex.ua";
                if (reg === 'tr') return "http://fx.yandex.com.tr";
                return "http://fx.yandex.ru";
            },
            'ie': function (reg) {
                if (reg === 'ru') return "http://ie.yandex.ru";
                if (reg === 'ua') return "http://ie.yandex.ua";
                if (reg === 'tr') return "http://ie.yandex.com.tr";
                return "http://ie.yandex.ru";
            },
            'bar-ie': function (reg) {
                if (reg === 'ru') return "http://bar.yandex.ru/ie";
                if (reg === 'ua') return "http://bar.yandex.ua/ie";
                if (reg === 'com') return "http://bar.yandex.com/ie";
                if (reg === 'by') return "http://bar.yandex.by/ie";
                if (reg === 'kz') return "http://bar.yandex.kz/ie";
                if (reg === 'tr') return "http://bar.yandex.com.tr/ie";
                return "http://bar.yandex.ru/ie";
            },
            'bar-ie9': function (reg) {
                if (reg === 'ru') return "http://bar.yandex.ru/ie";
                if (reg === 'ua') return "http://bar.yandex.ua/ie";
                if (reg === 'com') return "http://bar.yandex.com/ie";
                if (reg === 'by') return "http://bar.yandex.by/ie";
                if (reg === 'kz') return "http://bar.yandex.kz/ie";
                if (reg === 'tr') return "http://bar.yandex.com.tr/ie";
                return "http://bar.yandex.ru/ie";
            },
            'internet': function (reg) {
                if (reg === 'ru') return "http://internet.yandex.ru";
                if (reg === 'com') return "http://internet.yandex.com";
                if (reg === 'tr') return "http://internet.yandex.com.tr";
                return "http://internet.yandex.ru";
            },
            'keyboard': function (reg) {
                if (reg === 'ru') return "http://www.yandex.ru/index_engl_qwerty.html";
                return "http://www.yandex.ru/index_engl_qwerty.html";
            },
            'metro': function (reg) {
                if (reg === 'ru') return "http://metro.yandex.ru";
                return "http://metro.yandex.ru";
            },
            'pulse': function (reg) {
                if (reg === 'ru') return "http://blogs.yandex.ru/pulse";
                if (reg === 'ua') return "http://blogs.yandex.ua/pulse";
                if (reg === 'by') return "http://blogs.yandex.by/pulse";
                if (reg === 'kz') return "http://blogs.yandex.kz/pulse";
                return "http://blogs.yandex.ru/pulse";
            },
            'school': function (reg) {
                if (reg === 'ru') return "http://school.yandex.ru";
                return "http://school.yandex.ru";
            },
            'so': function (reg) {
                if (reg === 'ru') return "http://so.yandex.ru";
                return "http://so.yandex.ru";
            },
            'time': function (reg) {
                if (reg === 'ru') return "http://time.yandex.ru";
                if (reg === 'ua') return "http://time.yandex.ua";
                if (reg === 'com') return "http://time.yandex.com";
                if (reg === 'by') return "http://time.yandex.by";
                if (reg === 'kz') return "http://time.yandex.kz";
                if (reg === 'tr') return "http://time.yandex.com.tr";
                return "http://time.yandex.ru";
            },
            'xmlsearch': function (reg) {
                if (reg === 'ru') return "http://xml.yandex.ru";
                if (reg === 'ua') return "http://xml.yandex.ua";
                if (reg === 'com') return "http://xml.yandex.com";
                if (reg === 'by') return "http://xml.yandex.by";
                if (reg === 'kz') return "http://xml.yandex.kz";
                if (reg === 'tr') return "http://xml.yandex.com.tr";
                return "http://xml.yandex.ru";
            },
            'catalogwdgt': function (reg) {
                if (reg === 'ru') return "http://www.yandex.ru/catalog";
                return "http://www.yandex.ru/catalog";
            },
            'opera': function (reg) {
                if (reg === 'ru') return "http://opera.yandex.ru";
                if (reg === 'tr') return "http://opera.yandex.com.tr";
                return "http://opera.yandex.ru";
            },
            'uslugi': function (reg) {
                if (reg === 'ru') return "http://uslugi.yandex.ru";
                return "http://uslugi.yandex.ru";
            },
            'backapv': function (reg) {
                if (reg === 'ru') return "http://backapv.yandex.ru";
                return "http://backapv.yandex.ru";
            },
            'chrome': function (reg) {
                if (reg === 'ru') return "http://chrome.yandex.ru";
                return "http://chrome.yandex.ru";
            },
            'browser': function (reg) {
                if (reg === 'ru') return "http://browser.yandex.ru";
                return "http://browser.yandex.ru";
            },
            'aziada': function (reg) {
                if (reg === 'ru') return "http://aziada2011.yandex.kz";
                return "http://aziada2011.yandex.kz";
            },
            'translate': function (reg) {
                if (reg === 'ru') return "http://translate.yandex.ru";
                if (reg === 'ua') return "http://translate.yandex.ua";
                if (reg === 'com') return "http://translate.yandex.com";
                if (reg === 'by') return "http://translate.yandex.by";
                if (reg === 'kz') return "http://translate.yandex.kz";
                if (reg === 'tr') return "http://ceviri.yandex.com.tr";
                return "http://translate.yandex.ru";
            },
            'subs': function (reg) {
                if (reg === 'ru') return "http://subs.yandex.ru";
                return "http://subs.yandex.ru";
            },
            'all': function (reg) {
                if (reg === 'ru') return "http://www.yandex.ru/all";
                if (reg === 'ua') return "http://www.yandex.ua/all";
                if (reg === 'com') return "http://www.yandex.com/all";
                if (reg === 'by') return "http://www.yandex.by/all";
                if (reg === 'kz') return "http://www.yandex.kz/all";
                if (reg === 'tr') return "http://www.yandex.com.tr/all";
                return "http://www.yandex.ru/all";
            },
            'large': function (reg) {
                if (reg === 'ru') return "http://large.yandex.ru";
                return "http://large.yandex.ru";
            },
            'geocontext': function (reg) {
                if (reg === 'ru') return "http://geocontext.yandex.ru";
                return "http://geocontext.yandex.ru";
            },
            'root': function (reg) {
                if (reg === 'ru') return "http://root.yandex.ru";
                return "http://root.yandex.ru";
            },
            'yamb': function (reg) {
                if (reg === 'ru') return "https://yamb.yandex.ru";
                return "https://yamb.yandex.ru";
            },
            'legal': function (reg) {
                if (reg === 'ru') return "http://legal.yandex.ru";
                if (reg === 'ua') return "http://legal.yandex.ua";
                if (reg === 'com') return "http://legal.yandex.com";
                if (reg === 'tr') return "http://legal.yandex.com.tr";
                return "http://legal.yandex.ru";
            },
            'taxi': function (reg) {
                if (reg === 'ru') return "https://taxi.yandex.ru";
                return "https://taxi.yandex.ru";
            },
            'social': function (reg) {
                if (reg === 'ru') return "https://social.yandex.ru";
                if (reg === 'ua') return "https://social.yandex.ua";
                if (reg === 'com') return "https://social.yandex.ru";
                if (reg === 'by') return "https://social.yandex.by";
                if (reg === 'kz') return "https://social.yandex.kz";
                if (reg === 'tr') return "https://social.yandex.com.tr";
                return "https://social.yandex.ru";
            },
            'contest': function (reg) {
                if (reg === 'ru') return "http://contest.yandex.ru";
                if (reg === 'com') return "http://contest.yandex.com";
                return "http://contest.yandex.ru";
            },
            'peoplesearch': function (reg) {
                if (reg === 'ru') return "http://people.yandex.ru";
                return "http://people.yandex.ru";
            },
            'disk': function (reg) {
                if (reg === 'ru') return "http://disk.yandex.ru";
                if (reg === 'com') return "http://disk.yandex.com";
                if (reg === 'tr') return "http://disk.yandex.com.tr";
                return "http://disk.yandex.ru";
            },
            'sport': function (reg) {
                if (reg === 'ru') return "http://sport.yandex.ru";
                if (reg === 'by') return "http://sport.yandex.by";
                if (reg === 'ua') return "http://sport.yandex.ua";
                if (reg === 'kz') return "http://sport.yandex.kz";
                if (reg === 'tr') return "http://spor.yandex.com.tr";
                return "http://sport.yandex.ru";
            },
            'literacy': function (reg) {
                if (reg === 'ru') return "http://literacy.yandex.ru";
                return "http://literacy.yandex.ru";
            },
            'appsearch': function (reg) {
                if (reg === 'ru') return "//appsearch.yandex.ru";
                return "//appsearch.yandex.ru";
            },
            'ege': function (reg) {
                if (reg === 'ru') return "//ege.yandex.ru";
                return "//ege.yandex.ru";
            }
        };
        var serviceParams = {
            'afisha': {
                path: '/search',
                searchParam: 'text'
            },
            'auto': {
                path: '/search',
                searchParam: 'text'
            },
            'images': {
                path: '/search',
                searchParam: 'text',
                params: {
                    stype: 'image',
                    noreask: 1
                }
            },
            'maps': {
                path: '/',
                searchParam: 'text'
            },
            'market': {
                path: '/search.xml',
                searchParam: 'text'
            },
            'music': {
                rawPath: '/#!/search?text={searchText}'
            },
            'news': {
                path: '/yandsearch',
                searchParam: 'text',
                params: {
                    rpt: 'nnews2',
                    grhow: 'clutop'
                }
            },
            'search': {
                path: '/yandsearch',
                searchParam: 'text'
            },
            'slovari': {
                rawPath: '/{searchText}'
            },
            'translate': {
                path: '/',
                searchParam: 'text'
            },
            'video': {
                path: '/search',
                searchParam: 'text',
                params: {
                    where: 'all'
                }
            },
            'weather': {
                path: '/search',
                searchParam: 'request'
            }
        };

        bt.lib.services = {
            getServiceUrl: function (serviceName, reg) {
                return services[serviceName](reg);
            },

            getServiceName: function (id) {
                return bt.lib.i18n('y-services', id);
            },

            getServiceSearchUrl: function (serviceName, searchStr, reg) {
                var serviceUrl = bt.lib.services.getServiceUrl(serviceName, reg);
                var resultPath;
                var serviceInfo = serviceParams[serviceName];
                if (serviceInfo) {
                    if (serviceInfo.rawPath) {
                        resultPath = serviceInfo.rawPath.replace('{searchText}', searchStr);
                    } else {
                        resultPath = serviceInfo.path;
                        var hasParams = false;
                        var params = {};
                        var sourceServiceParams = serviceInfo.params;
                        var i;
                        if (sourceServiceParams) {
                            for (i in sourceServiceParams) {
                                params[i] = sourceServiceParams[i];
                                hasParams = true;
                            }
                        }
                        if (serviceInfo.searchParam) {
                            params[serviceInfo.searchParam] = searchStr;
                            hasParams = true;
                        }
                        if (hasParams) {
                            var queryParts = [];
                            for (i in params) {
                                queryParts.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));
                            }
                            resultPath += '?' + queryParts.join('&');
                        }
                    }
                    if (serviceUrl.charAt(serviceUrl.length - 1) === '/') {
                        return serviceUrl + resultPath.substr(1);
                    } else {
                        return serviceUrl + resultPath;
                    }
                } else {
                    return serviceUrl;
                }
            }
        };

    // end: ../../blocks/common/y-services/y-services.bt.js

    // begin: ../../blocks/common/y-services-board/y-services-board.bt.js


        var SERVICES_BOARD_DEFAULT_SERVICE_NAMES = [
            'images',
            'search',
            'news',
            'mail',
            'video',
            'translate',
            'browser',
            'afisha',
            'disk',
            'market',
            'slovari',
            'music',
            'taxi',
            'auto',
            'money'
        ];

        /**
         * @param {String[]} services Массив из сервисных идентификаторов. По нему будет построена поисковая вертикаль
         * @param {String} selectedService Идентификатор одного сервиса. Он будет выделен, как выбраный в списке
         */

        bt.setDefaultView('y-services-board', 'islet');

        bt.match('y-services-board_islet*', function (ctx) {
            ctx.setTag('ul');

            var services = ctx.getParam('services');
            if (!services) {
                services = SERVICES_BOARD_DEFAULT_SERVICE_NAMES;
            }

            ctx.setContent([
                services.map(function (serviceName) {
                    return {
                        elem: 'item',
                        service: serviceName,
                        selected: serviceName === ctx.getParam('selectedService')
                    };
                }),
                {elem: 'all'}
            ]);
        });

        bt.match('y-services-board_islet*__item', function (ctx) {
            ctx.setTag('li');

            ctx.setContent({
                elem: 'link',
                service: ctx.getParam('service'),
                selected: ctx.getParam('selected')
            });
        });

        bt.match('y-services-board_islet*__all', function (ctx) {
            ctx.setTag('li');
            ctx.setContent({
                block: 'y-button',
                view: 'islet-pseudo',
                text: 'Все сервисы',
                url: bt.lib.services.getServiceUrl('all-services')
            });
        });

        bt.match('y-services-board_islet*__link', function (ctx) {
            var service = ctx.getParam('service');

            ctx.setTag('a');
            ctx.setAttr('href', bt.lib.services.getServiceUrl(service || 'all-services'));

            if (service) {
                ctx.setAttr('data-service-name', service);
                ctx.setState('selected', ctx.getParam('selected') ? true : false);

                ctx.setContent(bt.lib.services.getServiceName(service));
            } else {
                ctx.setContent(ctx.getParam('content'));
            }

        });


    // end: ../../blocks/common/y-services-board/y-services-board.bt.js

    // begin: ../../blocks/common/y-fog/y-fog.bt.js


        bt.setDefaultView('y-fog', 'islet');


    // end: ../../blocks/common/y-fog/y-fog.bt.js

    // begin: ../../blocks/common/y-suggest/y-suggest.bt.js


        bt.setDefaultView('y-suggest', 'islet');

        bt.match('y-suggest_islet*', function (ctx) {
            ctx.enableAutoInit();
            var input = ctx.getParam('input');
            if (!input) {
                input = {
                    block: 'y-input'
                };
            }

            var suggestDropName = ctx.getParam('suggestDropName');
            if (suggestDropName) {
                ctx.setInitOption('suggestDropName', suggestDropName);
            }
            var suggestDropOptions = ctx.getParam('suggestDropOptions');
            if (suggestDropOptions) {
                ctx.setInitOption('suggestDropOptions', suggestDropOptions);
            }

            var dataProviderName = ctx.getParam('dataProviderName');
            if (dataProviderName) {
                ctx.setInitOption('dataProviderName', dataProviderName);
            }
            var dataProviderOptions = ctx.getParam('dataProviderOptions');
            if (dataProviderOptions) {
                ctx.setInitOption('dataProviderOptions', dataProviderOptions);
            }

            ctx.setContent(input);
        });


    // end: ../../blocks/common/y-suggest/y-suggest.bt.js

    // begin: ../../blocks/common/y-suggest-drop/y-suggest-drop.bt.js


        bt.setDefaultView('y-suggest-drop', 'islet');

        bt.match('y-suggest-drop_islet*', function (ctx) {
            ctx.setContent(ctx.getParam('groups'));
        });

        bt.match('y-suggest-drop_islet-header', function (ctx) {
            ctx.setContent(ctx.getParam('groups'));
            ctx.setInitOption('wide', true);
        });

        bt.match('y-suggest-drop_islet*__group', function (ctx) {
            ctx.setContent({
                elem: 'items',
                items: ctx.getParam('items')
            });
        });

        bt.match('y-suggest-drop_islet-header__group', function (ctx) {
            ctx.setContent([
                {
                    elem: 'group-title',
                    type: ctx.getParam('type')
                },
                {
                    elem: 'items',
                    items: ctx.getParam('items')
                }
            ]);
        });

        bt.match('y-suggest-drop_islet-header__group-title', function (ctx) {
            ctx.setContent(bt.lib.i18n('y-suggest-drop', 'group-type-' + ctx.getParam('type')));
        });

        bt.match('y-suggest-drop_islet*__content', function (ctx) {
            ctx.setContent(ctx.getParam('groups'));
        });

    //    bt.match('y-suggest-drop_islet-header__group', function (ctx) {
    //
    //    });

        bt.match('y-suggest-drop_islet*__items', function (ctx) {
            ctx.setTag('ul');
            ctx.setContent(ctx.getParam('items'));
        });


    // end: ../../blocks/common/y-suggest-drop/y-suggest-drop.bt.js

    // begin: ../../blocks/common/y-suggest-drop-item/y-suggest-drop-item.bt.js


        bt.setDefaultView('y-suggest-drop-item', 'islet');

        bt.match('y-suggest-drop-item_islet*', function (ctx) {
            ctx.setTag('li');
            ctx.setContent(ctx.getParam('text'));
        });


    // end: ../../blocks/common/y-suggest-drop-item/y-suggest-drop-item.bt.js

    (function(){
        function initKeyset(i18n) {
            if (!i18n || typeof i18n !== "function") {
                i18n = (function() {

                    function createI18nInstance() {
                        /**
                         * Возвращает локализованное значение ключа для переданного кейсета.
                         *
                         * @param {String} keysetName
                         * @param {String} keyName
                         * @param {Object} [options]
                         */
                        var i18n = function (keysetName, keyName, options) {
                            var keyset = i18n._keysets[keysetName];
                            if (!keyset) {
                                throw new Error('Keyset "' + keysetName + '" was not found.');
                            }
                            var value = keyset[keyName];
                            if (value === undefined) {
                                throw new Error('Key "' + keyName + '" in keyset "' + keysetName + '" was not found.');
                            }
                            if (typeof value === 'function') {
                                return value.call(this, options);
                            } else {
                                return value;
                            }
                        };

                        /**
                         * Хранилище кейсетов.
                         *
                         * @type {Object}
                         */
                        i18n._keysets = {};

                        /**
                         * Текущий язык.
                         *
                         * @type {String}
                         */
                        i18n._language = 'ru';

                        /**
                         * Добавляет кейсет в хранилище.
                         *
                         * @param {String} keysetName
                         * @param {Object} keysetData
                         */
                        i18n.add = function (keysetName, keysetData) {
                            i18n._keysets[keysetName] = keysetData;
                            return i18n;
                        };

                        /**
                         * Устанавливает текущий язык.
                         *
                         * @param {String} language
                         */
                        i18n.setLanguage = function (language) {
                            this._language = language;
                            return this;
                        };

                        /**
                         * Возвращает текущий язык.
                         *
                         * @returns {String}
                         */
                        i18n.getLanguage = function () {
                            return this._language;
                        };

                        return i18n;
                    }

                    return createI18nInstance();

                })();

            }

            i18n.add('logo', {
                "yandex": 'Яндекс',
                "src": 'live-header/img/X31pO5JJJKEifJ7sfvuf3mGeD_8.png'
            });

            i18n.add('y-services', {
                "404": '404',
                "adresa": 'Адреса',
                "advertising": 'Реклама',
                "afisha": 'Афиша',
                "all": 'Все сервисы',
                "api": 'API',
                "appsearch": 'Поиск приложений',
                "auto": 'Авто',
                "aziada": 'Азиада',
                "ba": 'Баян',
                "backapv": 'Партнер Я.Карт',
                "balance": 'Баланс',
                "bar": 'Бар',
                "bar-ie": 'Бар для ИЕ',
                "bar-ie9": 'Бар для ИЕ9',
                "bayan": 'Баннеры Яндекса',
                "blogs": 'Блоги',
                "books": 'Книги',
                "browser": 'Браузер',
                "calendar": 'Календарь',
                "captcha": 'ой...',
                "catalogwdgt": 'Каталог виджетов',
                "chrome": 'Хром с поиском Яндекса',
                "city": 'Города',
                "cityday": 'День города',
                "collection": 'Коллекция',
                "company": 'Компания',
                "contest": 'Contest',
                "desktop": 'Персональный поиск',
                "direct": 'Директ',
                "direct.market": 'Маркет',
                "disk": 'Диск',
                "ege": 'ЕГЭ',
                "expert": 'Эксперт',
                "feedback": 'Обратная связь',
                "ff": 'ФФ с поиском Яндекса',
                "fotki": 'Фотки',
                "games": 'Игрушки',
                "geocontext": 'Геоконтекст',
                "goroda": 'Города',
                "help": 'Помощь',
                "i": 'Мои сервисы',
                "ie": 'ИЕ с поиском Яндекса',
                "images": 'Картинки',
                "images-com": 'Картинки',
                "interests": 'Интересы',
                "internet": 'Интернет',
                "keyboard": 'Клавиатура',
                "kraski": 'Краски',
                "kuda": 'Куда все идут',
                "large": 'Яндекс для слабовидящих',
                "legal": 'Правовые документы',
                "lenta": 'Лента',
                "libra": 'Библиотека',
                "literacy": 'Неделя борьбы за грамотность',
                "local": 'Локальная сеть',
                "lost": 'Незабудки',
                "love": 'День взаимного тяготения — 13 августа',
                "mail": 'Почта',
                "maps": 'Карты',
                "maps-wiki": 'Народная карта',
                "market": 'Маркет',
                "market.advertising": 'Маркет',
                "metrika": 'Метрика',
                "metro": 'Метро',
                "mobile": 'Мобильный',
                "moikrug": 'Мой Круг',
                "money": 'Деньги',
                "museums": 'Дни исторического и культурного наследия',
                "music": 'Музыка',
                "music-partner": 'Музыка: статистика',
                "nahodki": 'Мои находки',
                "nano": 'Нано',
                "newhire": 'Наниматор',
                "news": 'Новости',
                "oauth": 'Авторизация',
                "online": 'Онлайн',
                "openid": 'OpenID',
                "opera": 'Opera Software',
                "opinion": 'Цитаты',
                "partners": 'Рекламная сеть',
                "partnersearch": 'Поиск для партнеров',
                "passport": 'Паспорт',
                "pdd": 'Почта для домена',
                "peoplesearch": 'Поиск людей',
                "perevod": 'Перевод',
                "probki": 'Пробки',
                "pulse": 'блоги: пульс',
                "punto": 'Punto switcher',
                "pvo": 'Ответы',
                "rabota": 'Работа',
                "ramazan": function (params) { return  },
                "rasp": 'Расписания',
                "realty": 'Недвижимость',
                "referats": 'Рефераты',
                "rk": 'Есть вопросы?',
                "root": 'Яндекс.Олимпиада для Unix администраторов',
                "school": 'Школа',
                "search": 'Поиск',
                "server": 'Сервер',
                "site": 'Поиск для сайта',
                "slovari": 'Словари',
                "so": 'Самооборона',
                "social": 'Социализм',
                "soft": 'Программы',
                "sport": 'Спорт',
                "sprav": 'Справочник',
                "start": 'Стартовая страница',
                "stat": 'Статистика',
                "subs": 'Подписки',
                "taxi": 'Такси',
                "terms": 'Разговорник',
                "tests": 'Тесты и опросы',
                "time": 'Яндекс.Время',
                "toster": 'Тосты',
                "translate": 'Перевод',
                "tune": 'Настройки',
                "tv": 'Телепрограмма',
                "uslugi": 'Услуги',
                "video": 'Видео',
                "video-com": 'Видео',
                "wdgt": 'Виджеты',
                "weather": 'Погода',
                "webmaster": 'Вебмастер',
                "widgets": 'Виджеты',
                "wordstat": 'Статистика',
                "wow": 'Я.ру',
                "www": 'Поиск',
                "xmlsearch": 'XML',
                "yaca": 'Каталог',
                "yamb": 'Медийные баннеры',
                "zakladki": 'Закладки'
            });

            i18n.add('y-suggest-drop', {
                "group-type-search": 'Поиск',
                "group-type-personal": 'Вы искали',
                "group-type-nav": 'Сайт'
            });
            i18n.setLanguage('ru');
            return i18n;
        }

        bt.lib.i18n = initKeyset();
    })();

    window.yHeaderBT = bt;
})();
