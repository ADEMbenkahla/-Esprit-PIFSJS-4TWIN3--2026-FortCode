pipeline {
    agent any
    
    environment {
        DOCKER_CREDS = credentials('docker-hub')
        BACKEND_IMAGE = "docker.io/${DOCKER_CREDS_USR}/backend:latest"
        FRONTEND_IMAGE = "docker.io/${DOCKER_CREDS_USR}/frontend:latest"
    }
    
    stages {
        // ========== BACKEND CI ==========
        stage('Backend - Checkout') {
            steps {
                dir('backend') {
                    checkout scm
                }
            }
        }
        
        stage('Backend - Install dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }
        
        stage('Backend - Unit Tests') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
                echo '✅ Backend tests passed!'
            }
        }
        
        stage('Backend - Build Docker Image') {
            steps {
                dir('backend') {
                    sh """
                        docker build -t ${BACKEND_IMAGE} .
                        docker push ${BACKEND_IMAGE}
                    """
                }
            }
        }
        
        // ========== FRONTEND CI ==========
        stage('Frontend - Checkout') {
            steps {
                dir('frontend') {
                    checkout scm
                }
            }
        }
        
        stage('Frontend - Install dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }
        
        stage('Frontend - Unit Tests') {
            steps {
                dir('frontend') {
                    sh 'npm test -- --watchAll=false'
                }
                echo '✅ Frontend tests passed!'
            }
        }
        
        stage('Frontend - Build Docker Image') {
            steps {
                dir('frontend') {
                    sh """
                        docker build -t ${FRONTEND_IMAGE} .
                        docker push ${FRONTEND_IMAGE}
                    """
                }
            }
        }
        
        // ========== CD ==========
        stage('Deploy Backend to Kubernetes') {
            steps {
                sh """
                    kubectl set image deployment/backend backend=${BACKEND_IMAGE} -n devops
                    kubectl rollout status deployment/backend -n devops
                """
            }
        }
        
        stage('Deploy Frontend to Kubernetes') {
            steps {
                sh """
                    kubectl set image deployment/frontend frontend=${FRONTEND_IMAGE} -n devops
                    kubectl rollout status deployment/frontend -n devops
                """
            }
        }
    }
    
    post {
        success {
            echo '🎉 Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed!'
        }
    }
}
