Template.top.show = function(){
  return Session.equals('state', 'list');
};

Template.top.posts = function(){
  var posts = Posts.find({}, {sort: {score: -1}});
  return posts;
};

Template.top.rendered = function(){
};