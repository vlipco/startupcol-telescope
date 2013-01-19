getNotification = function(event, properties){
  var notification = {};
  var p = properties;
  switch(event){
    case 'newReply':
      notification.subject = 'Someone replied to your comment on "'+p.postHeadline+'"';
      notification.text = p.commentAuthorName+' has replied to your comment on "'+p.postHeadline+'": '+Meteor.absoluteUrl()+'/posts/'+p.postId+'/comment/'+p.commentId
      notification.html = '<a href="/users/'+p.commentAuthorId+'">'+p.commentAuthorName+'</a> has replied to your comment on "<a href="/posts/'+p.postId+'/comment/'+p.commentId+'" class="action-link">'+p.postHeadline+'</a>".';
    break;

    case 'newComment':
      notification.subject = 'A new comment on your post "'+p.postHeadline+'"';
      notification.text = 'You have a new comment by '+p.commentAuthorName+' on your post "'+p.postHeadline+'": '+Meteor.absoluteUrl()+'/posts/'+p.postId+'/comment/'+p.commentId
      notification.html = '<a href="/users/'+p.commentAuthorId+'">'+p.commentAuthorName+'</a> left a new comment on your post "<a href="/posts/'+p.postId+'/comment/'+p.commentId+'" class="action-link">'+p.postHeadline+'</a>".';
    break;

    default:
    break;
  }
  return notification;
}