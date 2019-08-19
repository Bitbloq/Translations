import React from 'react';
import './ProjectsOptions.css';
import ProjectOptionsItem from './ProjectOptionsItem/ProjectOptionsItem';
import { User, Project, Language } from '../../types';
import { useMutation } from '@apollo/react-hooks';
import { gql } from 'apollo-boost';

interface ProjectsOptionsProps {
  users: User[];
  projects: Project[];
  languages: Language[];
  updateProject(
    projectWhereKey: string,
    projectWhereValue: string,
    updatedProject: Project,
  ): void;
}

const ProjectsOptions: React.FC<ProjectsOptionsProps> = (
  props: ProjectsOptionsProps,
) => {
  const ADD_NEW_USER = gql`
    mutation AddUserToProject(
      $project: ProjectWhereUniqueInput!
      $user: UserWhereUniqueInput!
    ) {
      addUserToProject(project: $project, user: $user) {
        id
        name
        languages {
          id
          name
          iso
          code
        }
        literals {
          id
        }
        users {
          id
          name
        }
        translations {
          id
        }
      }
    }
  `;

  const [addUserToProject] = useMutation(ADD_NEW_USER);

  return (
    <div className="ProjectsOptions">
      <ProjectOptionsItem header={true} />
      {props.projects.map((project: Project) => (
        <ProjectOptionsItem
          key={project.id}
          project={project}
          languages={props.languages}
          users={props.users}
          addUser={(userId: string) => {
            addUserToProject({
              variables: {
                project: {
                  name: project.name,
                },
                user: {
                  id: userId,
                },
              },
            }).then(result => {
              const project: Project = result.data.addUserToProject;
              props.updateProject('id', project.id, project);
            });
          }}
        />
      ))}
    </div>
  );
};

export default ProjectsOptions;
