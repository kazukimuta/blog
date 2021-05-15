import React from 'react'
import { Link } from 'gatsby'
import moment from 'moment'

const PostLink = ({ post }) => {
  return (
    <div className="post-link">
      <Link to={post.frontmatter.path}>
        <div className="post-row">
          <p className="post-meta">{moment(post.frontmatter.date).format('YY/MM/DD')}</p>
          <h2 className="post-title">{post.frontmatter.title}</h2>
        </div>
      </Link>
    </div>
  )
}

export default PostLink
