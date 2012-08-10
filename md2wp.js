/*
 * Usage: node ./md2wp.js <path to _posts dir> <mysql username>
 */

var fs = require('fs');
var md = require('node-markdown').Markdown;
var mysql = require('mysql');
var readline = require('readline');

var USER;
var posts = [];

var insertPosts = function() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.setPrompt('\nMySQL password?> ');
  rl.prompt();

  rl.on('line', function(pass) {
    var i = 0;

    var connection = mysql.createConnection({
      host: 'localhost',
      database: 'wordpress',
      user: USER,
      password: pass.trim()
    });

    console.log('\nDone parsing. Insertion time...\n');

    posts.forEach(function(post) {
      var row = {
        post_type: 'post',
        post_status: 'draft',
        post_author: 0,
        post_title: post.title,
        post_name: post.slug,
        post_date: post.date,
        post_date_gmt: post.date,
        post_content: post.content
      };

      connection.query('INSERT INTO cloudant_wp_posts SET ?', row, function(err, res) {
        if(err) {
          throw err;
        }

        console.log(res);

        i++;

        if(i === posts.length) {
          connection.end();

          process.exit(0);
        }
      });
    });
  }).on('close', function() {
    process.exit(0);
  });
};

if(!process.argv[2]) {
  console.error('No src dir provided.');
  process.exit(1);
}

if(!process.argv[3]) {
  console.error('No db user.');
  process.exit(1);
}

USER = process.argv[3];

if(process.argv[2].substr(-1) !== '/') {
  process.argv[2] += '/';
}

fs.readdir(process.argv[2], function(err, files) {
  console.log('%d files found.', files.length);

  files.forEach(function(file) {
    var post = {
      date: [],
      slug: null,
      title: '',
      author: '',
      content: ''
    };

    if(file.substr(-3) !== '.md') {
      return;
    }

    post.slug = file.split('-');

    post.date.push(post.slug.shift());
    post.date.push(post.slug.shift());
    post.date.push(post.slug.shift());
    post.date = post.date.join('-');
    post.date = post.date + ' 00:00:00';

    post.slug = post.slug.join ('-');    
    post.slug = post.slug.substr(0, post.slug.length - 3);

    console.log('Reading: %s', process.argv[2] + file);

    fs.readFile(process.argv[2] + file, 'utf-8', function(err, data) {
      var i;
      var isMeta = true;

      if(err) {
        throw err;
      }

      data = data.split('\n');

      if(data[0].trim() !== '---') {
        throw Error('Invalid markup.');
      }

      data.shift();

      for(i in data) {
        if(data[i].trim() === '---') {
          break;
        }
        else if(isMeta) {
          data[i] = data[i].split(': ');

          if(data[i][0] === 'author') {
            post.author = data[i][1].trim();
          }
          else if(data[i][0] === 'title') {
            post.title = data[i][1].trim();
          }
        }
      }

      post.content = md(data.slice(parseInt(i) + 1).join('\n'));

      posts.push(post);

      if(posts.length === files.length) {
        insertPosts();
      }
    });
  });
});
