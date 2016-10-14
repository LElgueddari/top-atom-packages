var request = require('request');
var cheerio = require('cheerio');
var async = require('async');
var fs = require('fs');
var tableify = require('markdown-tableify');

request('https://atom.io/packages/list?direction=desc&page=1&sort=stars', function (error, response, html) {
  var $ = cheerio.load(html);
  var $paginationLinks = $('.pagination a');
  var sortKey = "downloads";
  var currentPage = 1,
      lastPage = $($paginationLinks[$paginationLinks.length - 2]).text();

  var packages = [];

  // Iterate through each available result page
  async.whilst(function () {
    return currentPage <= lastPage;
  },
  function (next) {
    // Scrape content of page
    request('https://atom.io/packages/list?direction=desc&page=' + currentPage + '&sort=stars', function (error, response, body) {
      console.log('Scraping results page ' + currentPage + '...');

      // Check for possible errors
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(body);

        // For each package on current page
        $('.package-list .grid-cell').each(function(i, element){
          // Create object with package infos
          var package = {
            name: $(this).find('.card-name').text().trim(),
            nameLinkDOM: '[' + $(this).find('.card-name').text().trim() + '](https://atom.io/packages/' + $(this).find('.card-name').text().trim()  + ')',
            description: $(this).find('.card-description').text().trim(),
            author: $(this).find('.author').text().trim(),
            authorLink: $(this).find('.author').attr('href'),
            authorLinkDOM: '[' + $(this).find('.author').text().trim() + '](' + $(this).find('.author').attr('href') + ')',
            downloads: $(this).find('.stat[aria-label="Downloads"] .value').text().trim().replace(/,/g, ''),
            stars: $(this).find('.star-box .social-count').text().trim().replace(/,/g, '')
          };

          // Push to array
          packages.push(package);
        });
      }

      currentPage++;
      next();
    });
  },
  function (err) {
    console.log('Finished scraping');

    // Sort descending based on 'sortKey'
    packages.sort(function(a, b){
        return b[sortKey] - a[sortKey];
    });

    var table = tableify(packages, {
      headers: [{
        name: 'nameLinkDOM',
        align: ':---',
        title: 'Package Name'
      }, {
        name: 'authorLinkDOM',
        align: ':---',
        title: 'Author'
      }, {
        name: 'downloads',
        align: ':---'
      }, {
        name: 'stars',
        align: ':---'
      }]
    });

    // Write to file
    fs.writeFile('top-apm-packages.md', table, function(err) {
      console.log('Successfully stored packages in "top-apm-packages.md"!');
    });
  });
});
