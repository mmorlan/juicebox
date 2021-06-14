const express = require('express');
const postsRouter = express.Router();
const { getAllPosts, createPost } = require('../db');
const { requireUser } = require('./utils');

// postsRouter.post('/', requireUser, async (req, res, next) => {
//   res.send({ message: 'under construction' });
// });



postsRouter.use((req, res, next) => {
    console.log("A request is being made to /posts");
  
    next();
  });

postsRouter.get('/', async (req, res) => {
    const posts = await getAllPosts();
    res.send({
      posts
    });
  });

postsRouter.post('/', requireUser, async (req, res, next) => {
    //check the req body and make sure these values are valid
    const {
      authorId,
      title,
      content,
      tags = ""
    } = req.body;
  
    const tagArr = tags.trim().split(/\s+/);
    let postData = {};
  
    // only send the tags if there are some to send
    if (tagArr.length) {
      postData = {
        ...postData,
        authorId,
        tags: tagArr
      } 
    }
  
    try {
      postData = {
        ...postData,
        authorId: req.user.id,
        title,
        content
      };
      // this will create the post and the tags for us
      const createdPost = await createPost(postData);
  
      // if the post comes back, res.send({ post });
      if (postData) {
        res.send({ post: createdPost })
      }
    
      // otherwise, next an appropriate error object 
    } catch ({ name, message}) {
      next({ name: 'something', message: 'another something' });
    }
  });

postsRouter.patch('/:postId', requireUser, async (req, res, next) => {
    const { postId } = req.params;
    const { title, content, tags } = req.body;
  
    const updateFields = {};
  
    if (tags && tags.length > 0) {
      updateFields.tags = tags.trim().split(/\s+/);
    }
  
    if (title) {
      updateFields.title = title;
    }
  
    if (content) {
      updateFields.content = content;
    }
  
    try {
      const originalPost = await getPostById(postId);
  
      if (originalPost.author.id === req.user.id) {
        const updatedPost = await updatePost(postId, updateFields);
        res.send({ post: updatedPost })
      } else {
        next({
          name: 'UnauthorizedUserError',
          message: 'You cannot update a post that is not yours'
        })
      }
    } catch ({ name, message }) {
      next({ name, message });
    }
  });

postsRouter.get('/', async (req, res) => {
    try {
      const allPosts = await getAllPosts();
  
      const posts = allPosts.filter(post => {
        // keep a post if it is either active, or if it belongs to the current user
        if (post.active) {
          return true;
        }
      
        // the post is not active, but it belogs to the current user
        if (req.user && post.author.id === req.user.id) {
          return true;
        }

        // filter out any posts which are both inactive and not owned by the current user.
        if (!post.active && post.author.id != req.user.id) {
          return false;
        }
      
        // none of the above are true
        return false;
      });
  
      res.send({
        posts
      });
    } catch ({ name, message }) {
      next({ name, message });
    }
  });

postsRouter.delete('/:postId', requireUser, async (req, res, next) => {
    try {
      const post = await getPostById(req.params.postId);
  
      if (post && post.author.id === req.user.id) {
        const updatedPost = await updatePost(post.id, { active: false });
  
        res.send({ post: updatedPost });
      } else {
        // if there was a post, throw UnauthorizedUserError, otherwise throw PostNotFoundError
        next(post ? { 
          name: "UnauthorizedUserError",
          message: "You cannot delete a post which is not yours"
        } : {
          name: "PostNotFoundError",
          message: "That post does not exist"
        });
      }
  
    } catch ({ name, message }) {
      next({ name, message })
    }
  });

  module.exports = postsRouter;