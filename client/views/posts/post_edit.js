// Template.post_edit.preserve(['#title', '#url', '#editor', '#sticky']);

// Template.post_edit.preserve({
//   // 'input[id]': function (node) { return node.id; }
//    '[name]': function(node) { return node.getAttribute('name');}
// });

Template.post_edit.helpers({
  post: function(){
    return Posts.findOne(Session.get('selectedPostId'));
  },
  categories: function(){
    return Categories.find();
  },
  isChecked: function(){
    var post= Posts.findOne(Session.get('selectedPostId'));
    return $.inArray( this.name, post.categories) != -1;
  },
  submittedDate: function(){
    return moment(this.submitted).format("MMMM Do, h:mm:ss a");
  }
});

Template.post_edit.rendered = function(){
  var post= Posts.findOne(Session.get('selectedPostId'));
  if(post && !this.editor){
    this.editor= new EpicEditor(EpicEditorOptions).load();  
    this.editor.importFile('editor',post.body);
    $('#submitted').datepicker().on('changeDate', function(ev){
      $('#submitted_hidden').val(moment(ev.date).valueOf());
    });
  }
}

Template.post_edit.events = {
  'click input[type=submit]': function(e, instance){
    e.preventDefault();
    if(!Meteor.user()){
      throwError('You must be logged in.');
      return false;
    }

    var selectedPostId=Session.get('selectedPostId');
    var title= $('#title').val();
    var url = $('#url').val();
    var submitted = $('#submitted_hidden').val();
    var body = instance.editor.exportFile();
    var sticky=!!$('#sticky').attr('checked');
    var categories=[];

    $('input[name=category]:checked').each(function() {
       categories.push($(this).val());
     });

    console.log('categories:', categories);

    Posts.update(selectedPostId,
    {
        $set: {
            headline: title
          , url: url
          , submitted: parseInt(submitted)
          , body: body
          , sticky: sticky
          , categories: categories
        }
      }
    ,function(error){
      if(error){
        throwError(error.reason);
      }else{
        trackEvent("edit post", {'postId': selectedPostId});
        Router.navigate("posts/"+selectedPostId, {trigger:true});
      }
    }
    );
  }

  , 'click .delete-link': function(e){
    e.preventDefault();
    if(confirm("Are you sure?")){
      var selectedPostId=Session.get('selectedPostId');
      Posts.remove(selectedPostId);
      Router.navigate("posts/deleted", {trigger:true});
    }
  }
};