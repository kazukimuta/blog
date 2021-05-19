import React from 'react'
import { graphql } from 'gatsby'
import Layout from '../components/layout/layout'
import DocHeader from '../components/doc-header'
import PostList from '../components/post/postList'

import Config from '../config/config'

const IndexPage = ({
  data: {
    allMarkdownRemark: { edges },
  },
}) => {
  return (
    <Layout isRoot>
      <DocHeader title={Config.blogTitle} keywords={Config.blogKeyword} />
      <PostList posts={edges} />
    </Layout>
  )
}

export default IndexPage

export const pageQuery = graphql`
  query {
    allMarkdownRemark(sort: { order: DESC, fields: [frontmatter___date] }) {
      edges {
        node {
          id
          excerpt(pruneLength: 150)
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            path
            title
            tags
          }
        }
      }
    }
  }
`
