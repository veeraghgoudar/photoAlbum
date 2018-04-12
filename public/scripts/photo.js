var albumBucketName = 'awsbootcamp-cloudwalkers-singapore';
var bucketRegion = 'ap-southeast-1';
var IdentityPoolId = "ap-southeast-1:0b7d4524-d782-4374-baec-a0034071c541";
/*var albumBucketName = 'awsbootcamp-cloudwalkers';
var bucketRegion = 'eu-central-1';
var IdentityPoolId = "eu-central-1:be0fe351-33c3-410a-9ed9-e3f3c53d85dc";
*/

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {Bucket: albumBucketName}
});

var appVersion='4';
function getHtml(template){
  return template.join('\n');
}
listAlbums()

function listAlbums() {
  
  s3.listObjects({Delimiter: '/'}, function(err, data) {
    if (err) {
      return alert('There was an error listing your albums: ' + err.message);
    } else {
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace('/', ''));
        return getHtml([
          '<tr>',      
            '<td class="albumName" onclick="viewAlbum(\'' + albumName + '\')">',
			 albumName,
            '</td>',
			//'<td><button type="button" class="pullRight" onclick="deleteAlbum(\'' + albumName + '\')">Delete</button></td>',
			'<td><img title="Delete Album" style="cursor:pointer" src="/assets/delete.png" alt="Delete" onclick="deleteAlbum(\'' + albumName + '\')"></td>',
          '</tr>'
        ]);
      });
      var message = albums.length ?
        getHtml([
         // '<p>Click on an album name to view it.</p>',
         // '<p>Click on the X to delete the album.</p>'
        ]) :
        '<p>You do not have any albums. Please Create album.';
      var htmlTemplate = [
        '<div class=titleCloudWalkers ><h1>Cloud Walkers </h1></div> <h2>Albums</h2><h3>App Version:'+appVersion+'</h3>',
		 message,
        '<table id="customers" class="rowWidth"><tr><th>Album Name</th><th>Delete Album</th></tr>',
          getHtml(albums),
        '</table>',
        '<button class="myButton" onclick="createAlbum(prompt(\'Enter Album Name:\'))">',
          'Create New Album',
        '</button>'
      ]
      document.getElementById('app').innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
    
  albumName = albumName.trim();
  if (!albumName) {
    return alert('Album names must contain at least one non-space character.');
  }
  if (albumName.indexOf('/') !== -1) {
    return alert('Album names cannot contain slashes.');
  }
  var albumKey = encodeURIComponent(albumName) + '/';  
  s3.headObject({Key: albumKey}, function(err, data) {
    if (!err) {
      return alert('Album already exists.');
    }
    if (err.code !== 'NotFound') {
      return alert('There was an error creating your album: ' + err.message);
    }
    s3.putObject({Key: albumKey}, function(err, data) {
      if (err) {
        return alert('There was an error creating your album: ' + err.message);
      }
      alert('Successfully created album.');
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
    
  var albumPhotosKey = encodeURIComponent(albumName) + '//';
  s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    // `this` references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + '/';

    var photos = data.Contents.map(function(photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        '<span>',
          '<div>',
            '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
          '</div>',
          '<div>',                        
            '<span>',
              photoKey.replace(albumPhotosKey, ''),
            '</span>',
			'<img title="Delete Photo" style="cursor:pointer" src="/assets/delete.png" alt="Delete" onclick="deletePhoto(\'' + albumName + "','" + photoKey + '\')">',
          '</div>',
        '<span>',
      ]);
    });
    var message = photos.length ?
      '<span>Click on the </span><img src="/assets/delete.png" alt="Delete"><span> to delete the photo</span>' :
      '<p>You do not have any photos in this album. Please add photos.</p>';
    var htmlTemplate = [
      '<h2>',
        'Album: ' + albumName,
      '</h2>',
      message,
      '<div>',
        getHtml(photos),
      '</div>',
      '<input  id="photoupload" type="file" accept="image/*">',
      '<button class="myButton" id="addphoto" onclick="addPhoto(\'' + albumName +'\')">',
        'Add Photo',
      '</button>',
      '<button class="myButton" onclick="listAlbums()">',
        'Back To Albums',
      '</button>',
    ]
    document.getElementById('app').innerHTML = getHtml(htmlTemplate);
  });
}

function addPhoto(albumName) {
    
  var files = document.getElementById('photoupload').files;
  if (!files.length) {
    return alert('Please choose a file to upload first.');
  }
  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(albumName) + '//';

  var photoKey = albumPhotosKey + fileName;
  s3.upload({
    Key: photoKey,
    Body: file,
    ACL: 'public-read'
  }, function(err, data) {
    if (err) {
      return alert('There was an error uploading your photo: ', err.message);
    }
    alert('Successfully uploaded photo.');
    viewAlbum(albumName);
  });
}

function deletePhoto(albumName, photoKey) {
    
  s3.deleteObject({Key: photoKey}, function(err, data) {
    if (err) {
      return alert('There was an error deleting your photo: ', err.message);
    }
    alert('Successfully deleted photo.');
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
    if (confirm('Are you sure you want to Delete this Album ?')) {
    // Delete it!
	var albumKey = encodeURIComponent(albumName) + '/';
  s3.listObjects({Prefix: albumKey}, function(err, data) {
    if (err) {
      return alert('There was an error deleting your album: ', err.message);
    }
    var objects = data.Contents.map(function(object) {
      return {Key: object.Key};
    });
    s3.deleteObjects({
      Delete: {Objects: objects, Quiet: true}
    }, function(err, data) {
      if (err) {
        return alert('There was an error deleting your album: ', err.message);
      }
      alert('Successfully deleted album.');
      listAlbums();
    });
  });
} else {
    // Do nothing!
}
  
}