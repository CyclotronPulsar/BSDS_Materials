theta = 5
n = 100

x <- rlogis(n, location=theta, scale=1)

fisher_scoring_logis <- function(theta0,x){
  y <- exp(-(x-theta0))
  m <- mean(y/(1+y))
  theta1 <- theta0 + 3 - 6*m
  return(theta1)
}

iter_mle <- function(x,theta0,tol=1e-5,print=FALSE){
  e <- 100
  n_iter <- 0
  while(e>tol){
    theta1 <- fisher_scoring_logis(theta0,x)
    e <- abs(theta1-theta0)
    if(print) print(round(c(theta0,theta1,e),3))
    theta0 <- theta1
    n_iter <- n_iter+1
  }
  return(list(theta_hat=theta0,n_iter=n_iter))
}

logis_mle <- iter_mle(x,mean(x),1e-5,print=TRUE)

logis_mle <- iter_mle(x,median(x),1e-5,print=TRUE)

par(mfrow=c(2,2))

for(n in c(50,100,200,500)){
  theta_hats <- vector(mode="numeric",length=1000)
  for(i in 1:1000){
    x <- rlogis(n, location=theta, scale=1)
    logis_mle <- iter_mle(x,mean(x),1e-5)
    theta_hats[i] = logis_mle$theta_hat
  }
  hist(theta_hats,xlim=c(4,6),xlab="theta_hat",main=paste("n=",n,sep=""))
}

n=50
x <- rlogis(n,location=theta,scale=1)
iter_mle(x,0,1e-5,print=TRUE)

x <- rnorm(n,mean=theta,sd=10)
iter_mle(x,0,1e-5,print=TRUE)
print(mean(x))

x <- runif(n,min=0,max=theta)
iter_mle(x,0,1e-5,print=TRUE)
print(max(x))

x <- rcauchy(n,location=theta,scale=20)
iter_mle(x,0,1e-5,print=TRUE)

