import config from '../config';
import logger from './logger';
import throttle from 'lodash.throttle';
import React from 'react';

const _limit = 2;
const _requests = [];
let _maxScroll = 0;

function _sendTracking() {
  if (window.ga) {
    window.ga.apply(ga, Array.prototype.slice.call(arguments)); //eslint-disable-line no-undef
  } else {
    logger.error('ga not available');
  }
}

_sendTracking('create', config.analytics.id, config.analytics.cookieDomain);

setInterval(function () {
  for (let i = 0; i < _limit && _requests.length; i++) {
    _sendTracking.apply(_sendTracking, _requests.pop());
  }
}, 1000);

/**
 * Queue request to analytics
 */
function _request() {
  _requests.push(Array.prototype.slice.call(arguments));
}
/**
 * Extract the information to send to the event (category,action,label,value)
 * from the `data-trail` attribute of  `element`
 * If the HTML element passed to function doesn't have a `data-trail` it looks up
 * in the DOM for the closest node with a `data-trail` and return this one.
 *
 * @param element HTMLElement
 * @return String
 */
function _trail(element) {
  return (_dataset(element, 'trail')) ?
    _dataset(element, 'trail')
  : (element.parentElement) ? _trail(element.parentElement) : ',';
}
/**
 * dataset "polyfill" for <=IE10
 * for more info: http://caniuse.com/#search=dataset
 */
function _dataset(element, dataName) {
  return (element.dataset) ?
    element.dataset[dataName]
  : element.getAttribute('data-' + dataName);
}
/**
 * Return a string describing the HTMLElement with the following format:
 * `<tag>#<id>.<className>[textContent]`
 *
 * @param element HTMLElement
 * @return String
 */
function _elementSignature(element) {
  return element.localName +
    ( (element.id) ? '#' + element.id : '' ) +
    ( (element.className) ? '.' + element.className : '' ) +
    ( (element.textContent && element.textContent.length < 512) ?
        '[' + element.textContent + ']' : ''
    );
}

const tracker = {
  page: function (pagename, options) {
    logger.debug('tracking pageview', pagename, options);
    _request('send', 'pageview', options);
  },
  event: function (eventname, options) {
    logger.debug('tracking event', eventname, options);
    _request('send', 'event',
      (options) ? options.category : undefined,
      (options) ? options.action : undefined,
      (options) ? options.label : undefined,
      (options) ? options.value : undefined
    );
  },
  click: function (event) {
    const trail = _trail(event.target).split(',');
    if (trail.length) {
      logger.debug('tracking event', trail);
      _request('send', 'event',
        (trail[0]) ? trail[0] : 'none',
        (trail[1]) ? trail[1] : 'click',
        (trail[2]) ? trail[2] : _elementSignature(event.target)
      );
    }
  }
};
export default tracker;

function _beforeUnload() {
  let _scrollHeight = document.body.scrollHeight || document.documentElement.scrollHeight;
  let _viewportHeight = document.documentElement.clientHeight;
  let _currentScroll = document.body.scrollTop || document.documentElement.scrollTop;
  let _currentScrollPercent = Math.round(_currentScroll / (_scrollHeight - _viewportHeight) * 100);
  let _maxScrollPercent = Math.round(_maxScroll / (_scrollHeight - _viewportHeight) * 100);
  tracker.event('onCloseScroll', {
    category: 'engadgment',
    action: 'close scroll',
    label: _currentScrollPercent + '%',
    value: Math.round(_currentScroll)
  });
  tracker.event('maxScroll', {
    category: 'engadgment',
    action: 'max scroll',
    label: _maxScrollPercent + '%',
    value: Math.round(_maxScroll)
  });
}
const _onScroll = throttle(function () {
  let _currentScroll = document.body.scrollTop || document.documentElement.scrollTop;
  _maxScroll = (_currentScroll > _maxScroll) ? _currentScroll : _maxScroll;
}, 1000);

export function Tracker(Component) {
  class TrackerHoC extends React.Component {
    constructor(props) {
      super(props);
    }
    componentDidMount() {
      window.addEventListener('beforeunload', _beforeUnload);
      window.addEventListener('scroll', _onScroll);
      tracker.page('homepage');
    }
    componentWillUnount() {
      window.removeEventListener('scroll', _onScroll);
    }
    render() {
      return <Component {...this.props} {...this.state} onClick={tracker.click} />;
    }
  }
  return TrackerHoC;
}
