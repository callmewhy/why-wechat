var router = require('express').Router();
var pocket = require('pocket-sdk');
var moment = require('moment');

// ----------------------------------------------------------------------------
// function
// ----------------------------------------------------------------------------
function getLastWeekStart() {
  var today = moment();
  var daystoLastMonday = 0 - (1 - today.isoWeekday()) + 7;
  var lastMonday = today.subtract(daystoLastMonday, 'days');
  return lastMonday;
}

function getLastWeekEnd() {
  var lastMonday = getLastWeekStart();
  var lastSunday = lastMonday.add(6, 'days');
  return lastSunday;
}

function getNextWeekStart() {
  var lastMonday = getLastWeekEnd();
  var lastSunday = lastMonday.add(7, 'days');
  return lastSunday;
}


// ----------------------------------------------------------------------------
// router
// ----------------------------------------------------------------------------
router.get('/mycallback', function(req, res) {
  if (req.query.code) {
    res.cookie('access_token', req.query.code);
  }
  return res.redirect('/pocket/items');
});


router.get('/items', function(req, res) {
  var token = req.cookies['access_token'];
  if (!token) {
    return res.redirect('/pocket/authorize');
  }
  var sinceDay = getLastWeekEnd();
  var config = {
    access_token: token,
    state: 'archive',
    sort: 'newest',
    detailType: 'complete',
    since: sinceDay.unix()
  };
  return pocket.get(config, function(err, ret) {
    if (err) {
      return res.json(err);
    }
    var list = ret.list;
    var itemList = Object.keys(list)
      .map(function(key) {
        var item = list[key];
        var readTimeStr = moment(item.time_read, "X").format("YYYY-MM-DD");
        return {
          tag: Object.keys(item.tags)[0],
          title: item.resolved_title.replace('[', '【').replace(']', '】'),
          readTime: item.time_read,
          readTimeStr: readTimeStr,
          url: item.resolved_url
        };
      })
      .filter(function(item) {
        return moment(item.readTime, "X").isAfter(sinceDay);
      })
      .sort(function(a, b) {
        return b.readTime - a.readTime;
      });

    var items = {};
    itemList.forEach(function(item) {
      if (!items[item.tag]) {
        items[item.tag] = [];
      }
      items[item.tag].push(item);
    });
    var currTimeStr = getNextWeekStart().format("YYYY-MM-DD");
    res.render('weekly/items', {
      currTimeStr: currTimeStr,
      title: 'Weekly',
      items: items
    });
    return;
  });
});

router.get('*', function(req, res) {
  return res.redirect('/pocket/authorize');
});


module.exports = router;
