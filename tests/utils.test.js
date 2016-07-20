/**
 * Created by jemmy on 16/7/19.
 */
var utils = require('../lib/utils');
var expect = require('chai').expect;

describe('utils:Test', function () {
  describe('#getDefer', function () {
    var deferred = utils.getDefer();
    it('defer success', function() {
      deferred.resolve(true);
      deferred.promise.then(function (data) {
        expect(data).to.be.equal(true);
      });
    });
    it('defer fail', function() {
      deferred.reject(true);
      deferred.promise.catch(function (err) {
        expect(error).to.be.equal(true);
      });
    });

  })
});