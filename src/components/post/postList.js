import React from 'react'
import PropTypes from 'prop-types'
import PostLink from './postLink'

const PostList = ({ posts }) => {
  const postLinks = posts.map(post => (
    <PostLink key={post.node.id} post={post.node} />
  ))
  return (
  <div className="post-wrap">
    {postLinks}
  </div>)
}

PostList.propTypes = {
  posts: PropTypes.array,
}

PostList.defaultProps = {
  posts: [],
}
export default PostList
